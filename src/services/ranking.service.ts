import { PERSONA_DEFINITIONS, PERSONA_KEYS } from '@config';
import {
    IGitHubProfile,
    IGitHubRepoDetail,
    IPersonaDefinition,
    IPersonaRanking,
    IMetricBreakdown,
    MetricKey,
    PersonaGrade,
    PersonaKey,
    IRankingAnalysisContext,
    IRankProfileResult,
    ILeaderboardResult,
    ILeaderboardQuery,
    IPersonaSummary,
    METRIC_LABELS,
} from '@types';
import { githubService } from '@services';
import { profileRepository, rankingRepository } from '@repositories';
import { CustomError } from '@errors';
import { StatusCodes } from 'http-status-codes';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function clamp(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function normalizeLog(value: number, maxExpected: number): number {
    if (value <= 0) return 0;
    return clamp((Math.log10(value + 1) / Math.log10(maxExpected + 1)) * 100);
}

function normalizeLinear(value: number, maxExpected: number): number {
    return clamp((value / maxExpected) * 100);
}

function getOwnedRepos(repos: IGitHubRepoDetail[]): IGitHubRepoDetail[] {
    return repos.filter((repo) => !repo.fork && !repo.archived && !repo.disabled);
}

/**
 * Dynamic influence weight from repo codebase size (GitHub KB) + README length.
 * Larger repos contribute more to persona alignment and stack matching.
 */
function getRepoCodeWeight(repo: IGitHubRepoDetail): number {
    const sizeKb = repo.size ?? 0;
    const readmeChars = repo.readmeLength ?? 0;

    const sizeFactor = normalizeLog(sizeKb + 1, 100_000) / 100;
    const readmeFactor = normalizeLog(readmeChars + 1, 10_000) / 100;

    return 1 + sizeFactor * 4 + readmeFactor * 1.5;
}

function weightedAverage(values: number[], repos: IGitHubRepoDetail[]): number {
    if (!values.length) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    values.forEach((value, index) => {
        const weight = getRepoCodeWeight(repos[index]);
        weightedSum += value * weight;
        totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function getGrade(score: number): PersonaGrade {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 45) return 'Moderate';
    return 'Developing';
}

function matchesKeyword(text: string, keywords: string[]): boolean {
    const normalized = text.toLowerCase();
    return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function scoreLanguageAlignment(
    repos: IGitHubRepoDetail[],
    persona: IPersonaDefinition
): { score: number; summary: string } {
    const ownedRepos = getOwnedRepos(repos);

    if (ownedRepos.length === 0) {
        return { score: 0, summary: 'No original repositories to evaluate language fit' };
    }

    const personaLanguages = new Set(persona.languages.map((lang) => lang.toLowerCase()));
    let weightedTotal = 0;
    let weightedMatch = 0;

    for (const repo of ownedRepos) {
        const weight = getRepoCodeWeight(repo);
        weightedTotal += weight;

        if (repo.language && personaLanguages.has(repo.language.toLowerCase())) {
            weightedMatch += weight;
        }
    }

    const alignedCount = ownedRepos.filter(
        (repo) => repo.language && personaLanguages.has(repo.language.toLowerCase())
    ).length;

    const totalSizeMb = round(
        ownedRepos.reduce((sum, repo) => sum + repo.size, 0) / 1024
    );

    return {
        score: round(clamp((weightedMatch / weightedTotal) * 100)),
        summary: `${alignedCount}/${ownedRepos.length} original repos use ${persona.name} languages (weighted by ~${totalSizeMb}MB codebase)`,
    };
}

function scoreRepositoryQuality(repos: IGitHubRepoDetail[]): { score: number; summary: string } {
    const ownedRepos = getOwnedRepos(repos);

    if (ownedRepos.length === 0) {
        return { score: 0, summary: 'No original repositories to assess quality' };
    }

    const repoScores = ownedRepos.map((repo) => {
        let score = 0;
        if (repo.description && repo.description.length >= 20) score += 25;
        else if (repo.description) score += 12;
        if (repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION') score += 20;
        if (repo.topics.length > 0) score += 15;
        score += normalizeLog(repo.size, 50_000) * 0.20;
        if (repo.stargazers_count > 0) score += 10;
        if (repo.forks_count > 0) score += 10;
        if (repo.open_issues_count >= 0) score += 5;
        return score;
    });

    const avgScore = weightedAverage(repoScores, ownedRepos);
    const licensedCount = ownedRepos.filter(
        (repo) => repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION'
    ).length;
    const totalSizeMb = round(
        ownedRepos.reduce((sum, repo) => sum + repo.size, 0) / 1024
    );

    return {
        score: round(clamp(avgScore)),
        summary: `${licensedCount}/${ownedRepos.length} repos licensed; quality scored by size (~${totalSizeMb}MB total)`,
    };
}

function scoreDocumentation(repos: IGitHubRepoDetail[]): { score: number; summary: string } {
    const ownedRepos = getOwnedRepos(repos);

    if (ownedRepos.length === 0) {
        return { score: 0, summary: 'No original repositories to assess documentation' };
    }

    const readmeRepos = ownedRepos.filter((repo) => repo.hasReadme);

    let readmeCoverageWeighted = 0;
    let totalWeight = 0;
    let readmeLengthWeighted = 0;

    for (const repo of ownedRepos) {
        const weight = getRepoCodeWeight(repo);
        totalWeight += weight;
        if (repo.hasReadme) {
            readmeCoverageWeighted += weight;
            readmeLengthWeighted += repo.readmeLength * weight;
        }
    }

    const readmeCoverage = totalWeight > 0 ? (readmeCoverageWeighted / totalWeight) * 55 : 0;
    const avgReadmeLength = readmeCoverageWeighted > 0
        ? readmeLengthWeighted / readmeCoverageWeighted
        : 0;

    const readmeDepth = normalizeLinear(avgReadmeLength, 2500) * 0.25;
    const descriptionCoverage =
        (ownedRepos.filter((repo) => repo.description).length / ownedRepos.length) * 10;
    const homepageCoverage =
        (ownedRepos.filter((repo) => repo.homepage).length / ownedRepos.length) * 5;
    const wikiCoverage =
        (ownedRepos.filter((repo) => repo.has_wiki).length / ownedRepos.length) * 5;

    const readmeCount = ownedRepos.filter((repo) => repo.hasReadme).length;

    return {
        score: round(clamp(readmeCoverage + readmeDepth + descriptionCoverage + homepageCoverage + wikiCoverage)),
        summary: `${readmeCount}/${ownedRepos.length} repos have READMEs (avg ${Math.round(avgReadmeLength)} chars, size-weighted)`,
    };
}

function scoreActivity(repos: IGitHubRepoDetail[], profile: IGitHubProfile): { score: number; summary: string } {
    const ownedRepos = getOwnedRepos(repos);
    const now = Date.now();
    const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
    const oneYearMs = 1000 * 60 * 60 * 24 * 365;

    const recentWeight = ownedRepos.reduce((sum, repo) => {
        const isRecent = now - new Date(repo.pushed_at).getTime() <= sixMonthsMs;
        return sum + (isRecent ? getRepoCodeWeight(repo) : 0);
    }, 0);
    const yearlyWeight = ownedRepos.reduce((sum, repo) => {
        const isYearly = now - new Date(repo.pushed_at).getTime() <= oneYearMs;
        return sum + (isYearly ? getRepoCodeWeight(repo) : 0);
    }, 0);
    const totalCodeWeight = ownedRepos.reduce((sum, repo) => sum + getRepoCodeWeight(repo), 0);

    const recentRatio = totalCodeWeight > 0 ? (recentWeight / totalCodeWeight) * 45 : 0;
    const yearlyRatio = totalCodeWeight > 0 ? (yearlyWeight / totalCodeWeight) * 25 : 0;
    const repoVolume = normalizeLinear(profile.publicRepos, 30) * 0.20;
    const lastAnalyzedFreshness = profile.lastAnalyzedAt
        ? clamp(100 - ((now - new Date(profile.lastAnalyzedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)) * 20)
        : 50;

    const recentRepos = ownedRepos.filter(
        (repo) => now - new Date(repo.pushed_at).getTime() <= sixMonthsMs
    ).length;
    const yearlyRepos = ownedRepos.filter(
        (repo) => now - new Date(repo.pushed_at).getTime() <= oneYearMs
    ).length;

    return {
        score: round(clamp(recentRatio + yearlyRatio + repoVolume + lastAnalyzedFreshness * 0.10)),
        summary: `${recentRepos} repos updated in 6mo (${Math.round(recentWeight)} code-weight); ${yearlyRepos} in last year`,
    };
}

function scoreCommunityImpact(profile: IGitHubProfile, repos: IGitHubRepoDetail[]): { score: number; summary: string } {
    const ownedRepos = getOwnedRepos(repos);
    const totalStars = profile.totalStars;
    const totalForks = ownedRepos.reduce((sum, repo) => sum + repo.forks_count, 0);

    const followerScore = normalizeLog(profile.followers, 5000) * 0.35;
    const starScore = normalizeLog(totalStars, 1000) * 0.40;
    const forkScore = normalizeLog(totalForks, 250) * 0.25;

    return {
        score: round(clamp(followerScore + starScore + forkScore)),
        summary: `${profile.followers} followers, ${totalStars} total stars, ${totalForks} forks across owned repos`,
    };
}

function scoreProjectDepth(repos: IGitHubRepoDetail[]): { score: number; summary: string } {
    const ownedRepos = getOwnedRepos(repos);

    if (ownedRepos.length === 0) {
        return { score: 0, summary: 'No standout projects detected' };
    }

    const maxStars = Math.max(...ownedRepos.map((repo) => repo.stargazers_count));
    const totalSizeKb = ownedRepos.reduce((sum, repo) => sum + repo.size, 0);
    const maxSizeKb = Math.max(...ownedRepos.map((repo) => repo.size));
    const substantialRepos = ownedRepos.filter((repo) => repo.size >= 5_000).length;
    const notableProjects = ownedRepos.filter((repo) => repo.stargazers_count >= 10).length;

    const codebaseVolume = normalizeLog(totalSizeKb, 200_000) * 0.35;
    const largestRepo = normalizeLog(maxSizeKb, 100_000) * 0.30;
    const substantialRatio = normalizeLinear(substantialRepos, 5) * 0.20;
    const starSignal = normalizeLog(maxStars, 500) * 0.15;

    const totalSizeMb = round(totalSizeKb / 1024);
    const largestMb = round(maxSizeKb / 1024);

    return {
        score: round(clamp(codebaseVolume + largestRepo + substantialRatio + starSignal)),
        summary: `${totalSizeMb}MB total codebase; largest repo ${largestMb}MB; ${substantialRepos} repos ≥5MB; ${notableProjects} with 10+ stars`,
    };
}

function scoreTechStackMatch(
    repos: IGitHubRepoDetail[],
    persona: IPersonaDefinition
): { score: number; summary: string } {
    const ownedRepos = getOwnedRepos(repos);

    if (ownedRepos.length === 0) {
        return { score: 0, summary: 'No topics or stack signals found' };
    }

    const personaTopics = persona.topics.map((topic) => topic.toLowerCase());
    let matchedWeight = 0;
    let totalWeight = 0;
    let matchDepth = 0;
    let matchedRepoCount = 0;

    for (const repo of ownedRepos) {
        const weight = getRepoCodeWeight(repo);
        totalWeight += weight;

        const repoTopics = repo.topics.map((topic) => topic.toLowerCase());
        const repoMatches = personaTopics.filter((topic) =>
            repoTopics.includes(topic) ||
            (repo.description && repo.description.toLowerCase().includes(topic)) ||
            repo.name.toLowerCase().includes(topic)
        );

        if (repoMatches.length > 0) {
            matchedRepoCount += 1;
            matchedWeight += weight;
            matchDepth += repoMatches.length * weight;
        }
    }

    const coverageScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 65 : 0;
    const depthScore = totalWeight > 0
        ? normalizeLinear(matchDepth / totalWeight, 3) * 35
        : 0;

    return {
        score: round(clamp(coverageScore + depthScore)),
        summary: `${matchedRepoCount}/${ownedRepos.length} repos match ${persona.name} stack (weighted by codebase size)`,
    };
}

function scoreProfileCompleteness(
    profile: IGitHubProfile,
    persona: IPersonaDefinition
): { score: number; summary: string } {
    let score = 0;
    const filled: string[] = [];

    if (profile.bio) {
        score += 20;
        filled.push('bio');
        if (matchesKeyword(profile.bio, persona.bioKeywords)) score += 15;
    }

    if (profile.company) { score += 15; filled.push('company'); }
    if (profile.location) { score += 10; filled.push('location'); }
    if (profile.blog) { score += 15; filled.push('blog'); }
    if (profile.twitterUsername) { score += 10; filled.push('twitter'); }
    if (profile.name) { score += 10; filled.push('name'); }
    if (profile.avatarUrl) { score += 5; filled.push('avatar'); }
    if (profile.topLanguages.length >= 2) { score += 10; filled.push('language diversity'); }

    return {
        score: round(clamp(score)),
        summary: `Profile completeness signals: ${filled.join(', ') || 'minimal profile data'}`,
    };
}

const METRIC_SCORERS: Record<
    MetricKey,
    (context: IRankingAnalysisContext, persona: IPersonaDefinition) => { score: number; summary: string }
> = {
    languageAlignment: (ctx, persona) => scoreLanguageAlignment(ctx.repos, persona),
    repositoryQuality: (ctx) => scoreRepositoryQuality(ctx.repos),
    documentation: (ctx) => scoreDocumentation(ctx.repos),
    activity: (ctx) => scoreActivity(ctx.repos, ctx.profile),
    communityImpact: (ctx) => scoreCommunityImpact(ctx.profile, ctx.repos),
    projectDepth: (ctx) => scoreProjectDepth(ctx.repos),
    techStackMatch: (ctx, persona) => scoreTechStackMatch(ctx.repos, persona),
    profileCompleteness: (ctx, persona) => scoreProfileCompleteness(ctx.profile, persona),
};

function computePersonaRanking(
    context: IRankingAnalysisContext,
    personaKey: PersonaKey
): IPersonaRanking {
    const persona = PERSONA_DEFINITIONS[personaKey];
    const breakdown: IMetricBreakdown[] = [];
    let overallScore = 0;

    for (const metricKey of Object.keys(METRIC_LABELS) as MetricKey[]) {
        const { score, summary } = METRIC_SCORERS[metricKey](context, persona);
        const weight = persona.weights[metricKey];
        const weightedScore = round(score * weight);

        breakdown.push({
            key: metricKey,
            label: METRIC_LABELS[metricKey],
            score,
            weight: round(weight * 100) / 100,
            weightedScore,
            summary,
        });

        overallScore += weightedScore;
    }

    overallScore = round(overallScore);

    return {
        persona: personaKey,
        personaName: persona.name,
        overallScore,
        grade: getGrade(overallScore),
        breakdown,
        computedAt: new Date(),
    };
}

function parsePersonaKey(persona: string): PersonaKey {
    if (PERSONA_KEYS.includes(persona as PersonaKey)) {
        return persona as PersonaKey;
    }

    throw new CustomError(
        `Invalid persona "${persona}". Must be one of: ${PERSONA_KEYS.join(', ')}`,
        StatusCodes.BAD_REQUEST
    );
}

function resolvePagination(page?: number, limit?: number): { page: number; limit: number } {
    return {
        page: Math.max(Number(page) || DEFAULT_PAGE, 1),
        limit: Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT),
    };
}

async function rankProfile(userId: string, githubUsername: string): Promise<IRankProfileResult> {
    const profile = await profileRepository.findByUsername(userId, githubUsername);

    if (!profile) {
        throw new CustomError(
            `Profile "${githubUsername}" not found. Analyze the profile before ranking.`,
            StatusCodes.NOT_FOUND
        );
    }

    const repos = await githubService.fetchDetailedRepos(githubUsername);
    const context: IRankingAnalysisContext = {
        profile,
        repos,
        originalRepos: getOwnedRepos(repos),
    };

    const rankings = PERSONA_KEYS.map((personaKey) => computePersonaRanking(context, personaKey));
    await rankingRepository.upsertRankings(profile.id, rankings);

    const bestMatch = [...rankings].sort((a, b) => b.overallScore - a.overallScore)[0];
    await profileRepository.updateRankingSummary(profile.id, bestMatch.persona, bestMatch.overallScore);

    const updatedProfile = await profileRepository.findByUsername(userId, githubUsername);

    return {
        profile: updatedProfile!,
        rankings,
        bestMatch,
        reposAnalyzed: repos.length,
        computedAt: new Date(),
    };
}

async function getProfileRankings(
    userId: string,
    githubUsername: string
): Promise<{ profile: IGitHubProfile; rankings: IPersonaRanking[]; bestMatch: IPersonaRanking | null }> {
    const profile = await profileRepository.findByUsername(userId, githubUsername);

    if (!profile) {
        throw new CustomError(
            `Profile "${githubUsername}" not found`,
            StatusCodes.NOT_FOUND
        );
    }

    const rankings = await rankingRepository.findByProfileId(profile.id);

    if (!rankings.length) {
        throw new CustomError(
            `No rankings found for "${githubUsername}". Run POST /profiles/rank/${githubUsername} first.`,
            StatusCodes.NOT_FOUND
        );
    }

    const bestMatch = [...rankings].sort((a, b) => b.overallScore - a.overallScore)[0];

    return { profile, rankings, bestMatch };
}

async function getLeaderboard(
    userId: string,
    query: ILeaderboardQuery
): Promise<ILeaderboardResult> {
    const persona = parsePersonaKey(query.persona);
    const { page, limit } = resolvePagination(query.page, query.limit);
    const minScore = query.minScore !== undefined ? Number(query.minScore) : undefined;

    if (minScore !== undefined && Number.isNaN(minScore)) {
        throw new CustomError('Invalid minScore value', StatusCodes.BAD_REQUEST);
    }

    return rankingRepository.getLeaderboard(userId, persona, page, limit, minScore);
}

function getPersonas(): IPersonaSummary[] {
    return PERSONA_KEYS.map((key) => ({
        key,
        name: PERSONA_DEFINITIONS[key].name,
        description: PERSONA_DEFINITIONS[key].description,
        metricLabels: METRIC_LABELS,
    }));
}

export default {
    rankProfile,
    getProfileRankings,
    getLeaderboard,
    getPersonas,
    parsePersonaKey,
};
