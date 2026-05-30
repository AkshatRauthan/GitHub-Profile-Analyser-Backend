import { prisma } from '@config';
import { profileSearchHelpers } from '@helpers';
import {
    IGitHubProfile,
    IGitHubAnalysisRequest,
    IProfileInsights,
    IProfileSearchFilters,
    IProfileSearchResult,
    IPaginatedResult,
    ProfileSortField,
    SortOrder,
} from '@types';

function parseProfile(rawProfile: any): IGitHubProfile {
    return {
        ...rawProfile,
        topLanguages: rawProfile.topLanguages
            ? JSON.parse(rawProfile.topLanguages)
            : [],
    };
}

function parseAnalysisRequest(rawRequest: any): IGitHubAnalysisRequest {
    return {
        ...rawRequest,
        status: rawRequest.status as 'success' | 'failed',
    };
}

async function upsertProfile(
    userId: string,
    insights: IProfileInsights
): Promise<IGitHubProfile> {
    const profile = await prisma.github_profile.upsert({
        where: {
            userId_githubUsername: {
                userId,
                githubUsername: insights.githubUsername,
            },
        },
        create: {
            userId,
            githubUsername: insights.githubUsername,
            name: insights.name,
            avatarUrl: insights.avatarUrl,
            bio: insights.bio,
            location: insights.location,
            company: insights.company,
            blog: insights.blog,
            twitterUsername: insights.twitterUsername,
            publicRepos: insights.publicRepos,
            followers: insights.followers,
            following: insights.following,
            totalStars: insights.totalStars,
            topLanguages: JSON.stringify(insights.topLanguages),
            accountCreatedAt: insights.accountCreatedAt,
            lastAnalyzedAt: new Date(),
        },
        update: {
            name: insights.name,
            avatarUrl: insights.avatarUrl,
            bio: insights.bio,
            location: insights.location,
            company: insights.company,
            blog: insights.blog,
            twitterUsername: insights.twitterUsername,
            publicRepos: insights.publicRepos,
            followers: insights.followers,
            following: insights.following,
            totalStars: insights.totalStars,
            topLanguages: JSON.stringify(insights.topLanguages),
            accountCreatedAt: insights.accountCreatedAt,
            lastAnalyzedAt: new Date(),
        },
    });

    return parseProfile(profile);
}

async function findByUsername(
    userId: string,
    githubUsername: string
): Promise<IGitHubProfile | null> {
    const profile = await prisma.github_profile.findUnique({
        where: {
            userId_githubUsername: { userId, githubUsername },
        },
    });

    return profile ? parseProfile(profile) : null;
}

async function findAllByUserId(
    userId: string,
    page: number,
    limit: number
): Promise<IPaginatedResult<IGitHubProfile>> {
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
        prisma.github_profile.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { lastAnalyzedAt: 'desc' },
        }),
        prisma.github_profile.count({ where: { userId } }),
    ]);

    return {
        items: profiles.map(parseProfile),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 0,
        },
    };
}

async function getIdsMatchingJsonFilters(
    userId: string,
    filters: IProfileSearchFilters
): Promise<string[] | null> {
    const needsTopLanguageCount = filters.minTopLanguages !== undefined;
    const needsLanguageRepoCount =
        filters.language !== undefined && filters.minLanguageRepos !== undefined;

    if (!needsTopLanguageCount && !needsLanguageRepoCount) {
        return null;
    }

    let matchingIds: string[] | null = null;

    if (needsTopLanguageCount) {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM github_profiles
            WHERE userId = ${userId}
            AND topLanguages IS NOT NULL
            AND JSON_LENGTH(topLanguages) >= ${filters.minTopLanguages}
        `;
        matchingIds = rows.map((row: { id: string }) => row.id);
    }

    if (needsLanguageRepoCount) {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
            SELECT DISTINCT gp.id FROM github_profiles gp,
            JSON_TABLE(gp.topLanguages, '$[*]' COLUMNS (
                lang VARCHAR(100) PATH '$.language',
                repoCount INT PATH '$.count'
            )) AS lang_data
            WHERE gp.userId = ${userId}
            AND lang_data.lang = ${filters.language}
            AND lang_data.repoCount >= ${filters.minLanguageRepos}
        `;
        const languageIds = rows.map((row: { id: string }) => row.id);
        matchingIds = matchingIds
            ? matchingIds.filter((id) => languageIds.includes(id))
            : languageIds;
    }

    return matchingIds ?? [];
}

async function searchProfiles(
    userId: string,
    filters: IProfileSearchFilters,
    page: number,
    limit: number
): Promise<IProfileSearchResult> {
    const skip = (page - 1) * limit;
    const where = profileSearchHelpers.buildPrismaWhere(userId, filters) as any;

    const jsonFilterIds = await getIdsMatchingJsonFilters(userId, filters);

    if (jsonFilterIds !== null) {
        if (jsonFilterIds.length === 0) {
            return {
                items: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
                appliedFilters: profileSearchHelpers.getAppliedFilters(filters),
                ...(filters.persona && {
                    persona: filters.persona,
                    personaName: profileSearchHelpers.getPersonaName(filters.persona),
                }),
            };
        }
        where.id = { in: jsonFilterIds };
    }

    if (filters.persona) {
        where.rankings = {
            some: {
                persona: filters.persona,
                ...(filters.minPersonaScore !== undefined || filters.maxPersonaScore !== undefined
                    ? {
                        overallScore: {
                            ...(filters.minPersonaScore !== undefined && { gte: filters.minPersonaScore }),
                            ...(filters.maxPersonaScore !== undefined && { lte: filters.maxPersonaScore }),
                        },
                    }
                    : {}),
            },
        };
    }

    if (filters.bestPersona) {
        where.bestPersona = filters.bestPersona;
    }

    const sortBy: ProfileSortField = filters.sortBy ?? 'lastAnalyzedAt';
    const sortOrder: SortOrder = filters.sortOrder ?? 'desc';

    let profiles: any[];
    let total: number;

    if (sortBy === 'personaScore' && filters.persona) {
        const rankingWhere = {
            persona: filters.persona,
            profile: where,
            ...(filters.minPersonaScore !== undefined || filters.maxPersonaScore !== undefined
                ? {
                    overallScore: {
                        ...(filters.minPersonaScore !== undefined && { gte: filters.minPersonaScore }),
                        ...(filters.maxPersonaScore !== undefined && { lte: filters.maxPersonaScore }),
                    },
                }
                : {}),
        };

        const [rankedRows, rankedTotal] = await Promise.all([
            prisma.profile_ranking.findMany({
                where: rankingWhere,
                include: { profile: true },
                orderBy: { overallScore: sortOrder },
                skip,
                take: limit,
            }),
            prisma.profile_ranking.count({ where: rankingWhere }),
        ]);

        profiles = rankedRows.map((row: { profile: any }) => row.profile);
        total = rankedTotal;
    } else {
        [profiles, total] = await Promise.all([
            prisma.github_profile.findMany({
                where,
                skip,
                take: limit,
                orderBy: sortBy === 'personaScore'
                    ? { bestPersonaScore: sortOrder }
                    : { [sortBy]: sortOrder },
                include: filters.persona
                    ? { rankings: { where: { persona: filters.persona } } }
                    : undefined,
            }),
            prisma.github_profile.count({ where }),
        ]);
    }

    return {
        items: profiles.map(parseProfile),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 0,
        },
        appliedFilters: profileSearchHelpers.getAppliedFilters(filters),
        ...(filters.persona && {
            persona: filters.persona,
            personaName: profileSearchHelpers.getPersonaName(filters.persona),
        }),
    };
}

async function updateRankingSummary(
    profileId: string,
    bestPersona: string,
    bestPersonaScore: number
): Promise<void> {
    await prisma.github_profile.update({
        where: { id: profileId },
        data: {
            bestPersona,
            bestPersonaScore,
            lastRankedAt: new Date(),
        },
    });
}

async function createAnalysisRequest(data: {
    userId: string;
    githubUsername: string;
    profileId?: string;
    status: 'success' | 'failed';
    errorMessage?: string;
}): Promise<IGitHubAnalysisRequest> {
    const request = await prisma.github_analysis_request.create({ data });
    return parseAnalysisRequest(request);
}

async function findRequestsByUserId(
    userId: string,
    page: number,
    limit: number
): Promise<IPaginatedResult<IGitHubAnalysisRequest>> {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
        prisma.github_analysis_request.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.github_analysis_request.count({ where: { userId } }),
    ]);

    return {
        items: requests.map(parseAnalysisRequest),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 0,
        },
    };
}

export default {
    upsertProfile,
    findByUsername,
    findAllByUserId,
    searchProfiles,
    updateRankingSummary,
    createAnalysisRequest,
    findRequestsByUserId,
};
