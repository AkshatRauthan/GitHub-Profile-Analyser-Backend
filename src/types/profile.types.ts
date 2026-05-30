export interface ILanguageStat {
    language: string;
    count: number;
}

export interface IContributionDay {
    date: string;
    count: number;
}

export type HeatmapPeriod = 'currWeek' | 'currMonth' | 'currYear';

export interface IContributionHeatmap {
    githubUsername: string;
    period: HeatmapPeriod;
    from: string;
    to: string;
    totalContributions: number;
    days: IContributionDay[];
}

export interface IGitHubProfile {
    id: string;
    userId: string;
    githubUsername: string;

    name?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    location?: string | null;
    company?: string | null;
    blog?: string | null;
    twitterUsername?: string | null;

    publicRepos: number;
    followers: number;
    following: number;
    totalStars: number;
    topLanguages: ILanguageStat[];
    accountCreatedAt?: Date | null;

    bestPersona?: string | null;
    bestPersonaScore?: number | null;
    lastRankedAt?: Date | null;

    lastAnalyzedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IGitHubAnalysisRequest {
    id: string;
    userId: string;
    githubUsername: string;
    profileId?: string | null;
    status: 'success' | 'failed';
    errorMessage?: string | null;
    createdAt: Date;
}

export interface IGitHubUserResponse {
    login: string;
    name: string | null;
    avatar_url: string;
    bio: string | null;
    location: string | null;
    company: string | null;
    blog: string | null;
    twitter_username: string | null;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
}

export interface IGitHubRepoResponse {
    language: string | null;
    stargazers_count: number;
}

export interface IProfileInsights {
    githubUsername: string;
    name?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    location?: string | null;
    company?: string | null;
    blog?: string | null;
    twitterUsername?: string | null;
    publicRepos: number;
    followers: number;
    following: number;
    totalStars: number;
    topLanguages: ILanguageStat[];
    accountCreatedAt?: Date | null;
}

export interface IGitHubContributionGraphQLResponse {
    data: {
        user: {
            contributionsCollection: {
                contributionCalendar: {
                    totalContributions: number;
                    weeks: {
                        contributionDays: {
                            date: string;
                            contributionCount: number;
                        }[];
                    }[];
                };
            };
        } | null;
    };
    errors?: { message: string }[];
}

export interface IPaginationQuery {
    page?: number;
    limit?: number;
}

export type ProfileSortField =
    | 'githubUsername'
    | 'name'
    | 'publicRepos'
    | 'totalStars'
    | 'followers'
    | 'following'
    | 'lastAnalyzedAt'
    | 'createdAt'
    | 'accountCreatedAt'
    | 'bestPersonaScore'
    | 'personaScore';

export type SortOrder = 'asc' | 'desc';

export interface IProfileSearchFilters {
    q?: string;
    githubUsername?: string;
    name?: string;
    bio?: string;
    location?: string;
    company?: string;
    blog?: string;

    languages?: string[];
    languagesMatch?: 'any' | 'all';
    primaryLanguage?: string;
    minTopLanguages?: number;
    language?: string;
    minLanguageRepos?: number;

    minStars?: number;
    maxStars?: number;
    minRepos?: number;
    maxRepos?: number;
    minFollowers?: number;
    maxFollowers?: number;
    minFollowing?: number;
    maxFollowing?: number;

    accountCreatedAfter?: Date;
    accountCreatedBefore?: Date;
    lastAnalyzedAfter?: Date;
    lastAnalyzedBefore?: Date;
    minAccountAgeDays?: number;
    maxAccountAgeDays?: number;

    hasBio?: boolean;
    hasCompany?: boolean;
    hasLocation?: boolean;
    hasBlog?: boolean;
    hasTwitter?: boolean;

    persona?: string;
    minPersonaScore?: number;
    maxPersonaScore?: number;
    bestPersona?: string;

    sortBy?: ProfileSortField;
    sortOrder?: SortOrder;
}

export interface IProfileSearchQuery extends IPaginationQuery, Omit<IProfileSearchFilters, 'languages'> {
    languages?: string;
}

export interface IProfileSearchResult extends IPaginatedResult<IGitHubProfile> {
    appliedFilters: Partial<IProfileSearchFilters>;
    persona?: string;
    personaName?: string;
}

export interface IPaginatedResult<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
