import { IGitHubProfile, IPaginatedResult } from '@types';

export type PersonaKey =
    | 'frontend_developer'
    | 'backend_developer'
    | 'fullstack_developer'
    | 'ai_engineer'
    | 'devops_engineer'
    | 'mobile_developer';

export type MetricKey =
    | 'languageAlignment'
    | 'repositoryQuality'
    | 'documentation'
    | 'activity'
    | 'communityImpact'
    | 'projectDepth'
    | 'techStackMatch'
    | 'profileCompleteness';

export type PersonaGrade = 'Excellent' | 'Strong' | 'Good' | 'Moderate' | 'Developing';

export interface IMetricWeights {
    languageAlignment: number;
    repositoryQuality: number;
    documentation: number;
    activity: number;
    communityImpact: number;
    projectDepth: number;
    techStackMatch: number;
    profileCompleteness: number;
}

export interface IPersonaDefinition {
    key: PersonaKey;
    name: string;
    description: string;
    languages: string[];
    topics: string[];
    bioKeywords: string[];
    weights: IMetricWeights;
}

export interface IMetricBreakdown {
    key: MetricKey;
    label: string;
    score: number;
    weight: number;
    weightedScore: number;
    summary: string;
}

export interface IPersonaRanking {
    persona: PersonaKey;
    personaName: string;
    overallScore: number;
    grade: PersonaGrade;
    breakdown: IMetricBreakdown[];
    computedAt: Date;
}

export interface IProfileRankingRecord extends IPersonaRanking {
    id: string;
    profileId: string;
}

export interface IGitHubRepoDetail {
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    watchers_count: number;
    size: number;
    fork: boolean;
    archived: boolean;
    disabled: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    homepage: string | null;
    topics: string[];
    license: { spdx_id: string | null; name: string } | null;
    updated_at: string;
    pushed_at: string;
    created_at: string;
    default_branch: string;
    hasReadme: boolean;
    readmeLength: number;
}

export interface IRankingAnalysisContext {
    profile: IGitHubProfile;
    repos: IGitHubRepoDetail[];
    originalRepos: IGitHubRepoDetail[];
}

export interface IRankProfileResult {
    profile: IGitHubProfile;
    rankings: IPersonaRanking[];
    bestMatch: IPersonaRanking;
    reposAnalyzed: number;
    computedAt: Date;
}

export interface ILeaderboardEntry {
    rank: number;
    profile: IGitHubProfile;
    persona: PersonaKey;
    personaName: string;
    overallScore: number;
    grade: PersonaGrade;
    computedAt: Date;
}

export interface ILeaderboardResult extends IPaginatedResult<ILeaderboardEntry> {
    persona: PersonaKey;
    personaName: string;
}

export interface ILeaderboardQuery {
    persona: string;
    page?: number;
    limit?: number;
    minScore?: number;
}

export interface IPersonaSummary {
    key: PersonaKey;
    name: string;
    description: string;
    metricLabels: Record<MetricKey, string>;
}

export const METRIC_LABELS: Record<MetricKey, string> = {
    languageAlignment: 'Language Alignment',
    repositoryQuality: 'Repository Quality',
    documentation: 'Documentation & README',
    activity: 'Activity & Freshness',
    communityImpact: 'Community Impact',
    projectDepth: 'Project Depth',
    techStackMatch: 'Tech Stack Match',
    profileCompleteness: 'Profile Completeness',
};
