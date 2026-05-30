import axios from 'axios';
import { CustomError } from '@errors';
import { serverConfig } from '@config';
import { StatusCodes } from 'http-status-codes';
import {
    IGitHubUserResponse,
    IGitHubRepoResponse,
    IProfileInsights,
    ILanguageStat,
    IContributionHeatmap,
    HeatmapPeriod,
    IGitHubContributionGraphQLResponse,
    IGitHubRepoDetail,
} from '@types';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const MAX_REPOS_TO_ANALYZE = 100;
const MAX_README_CHECKS = 40;
const README_CONCURRENCY = 5;

const HEATMAP_PERIODS: HeatmapPeriod[] = ['currWeek', 'currMonth', 'currYear'];

interface IGitHubRepoApiResponse {
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
    private?: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    homepage: string | null;
    topics?: string[];
    license: { spdx_id: string | null; name: string } | null;
    updated_at: string;
    pushed_at: string;
    created_at: string;
    default_branch: string;
}

interface IGitHubRepoGraphQLNode {
    name: string;
    nameWithOwner: string;
    description: string | null;
    primaryLanguage: { name: string } | null;
    stargazerCount: number;
    forkCount: number;
    issues: { totalCount: number };
    diskUsage: number | null;
    isFork: boolean;
    isArchived: boolean;
    isDisabled: boolean;
    isPrivate: boolean;
    hasWikiEnabled: boolean;
    homepageUrl: string | null;
    repositoryTopics: { nodes: { topic: { name: string } }[] };
    licenseInfo: { spdxId: string | null; name: string } | null;
    updatedAt: string;
    pushedAt: string | null;
    createdAt: string;
    defaultBranchRef: { name: string } | null;
}

interface IGitHubReposGraphQLResponse {
    data: {
        user: {
            repositories: {
                nodes: IGitHubRepoGraphQLNode[];
            };
        } | null;
    };
    errors?: { message: string }[];
}

const CONTRIBUTION_HEATMAP_QUERY = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
                restrictedContributionsCount
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            date
                            contributionCount
                        }
                    }
                }
            }
        }
    }
`;

const ACCESSIBLE_REPOS_QUERY = `
    query($username: String!, $first: Int!) {
        user(login: $username) {
            repositories(
                first: $first
                orderBy: { field: PUSHED_AT, direction: DESC }
                ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
            ) {
                nodes {
                    name
                    nameWithOwner
                    description
                    primaryLanguage { name }
                    stargazerCount
                    forkCount
                    issues { totalCount }
                    diskUsage
                    isFork
                    isArchived
                    isDisabled
                    isPrivate
                    hasWikiEnabled
                    homepageUrl
                    repositoryTopics(first: 20) { nodes { topic { name } } }
                    licenseInfo { spdxId name }
                    updatedAt
                    pushedAt
                    createdAt
                    defaultBranchRef { name }
                }
            }
        }
    }
`;

function getHeaders() {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
    };

    if (serverConfig.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${serverConfig.GITHUB_TOKEN}`;
    }

    return headers;
}

function mapGraphQLRepoToApi(node: IGitHubRepoGraphQLNode): IGitHubRepoApiResponse {
    return {
        name: node.name,
        full_name: node.nameWithOwner,
        description: node.description,
        language: node.primaryLanguage?.name ?? null,
        stargazers_count: node.stargazerCount,
        forks_count: node.forkCount,
        open_issues_count: node.issues.totalCount,
        watchers_count: node.stargazerCount,
        size: node.diskUsage ?? 0,
        fork: node.isFork,
        archived: node.isArchived,
        disabled: node.isDisabled,
        private: node.isPrivate,
        has_wiki: node.hasWikiEnabled,
        has_pages: Boolean(node.homepageUrl),
        homepage: node.homepageUrl,
        topics: node.repositoryTopics.nodes.map(({ topic }) => topic.name),
        license: node.licenseInfo
            ? { spdx_id: node.licenseInfo.spdxId, name: node.licenseInfo.name }
            : null,
        updated_at: node.updatedAt,
        pushed_at: node.pushedAt ?? node.updatedAt,
        created_at: node.createdAt,
        default_branch: node.defaultBranchRef?.name ?? 'main',
    };
}

async function fetchPublicReposRest(username: string): Promise<IGitHubRepoApiResponse[]> {
    const { data } = await axios.get<IGitHubRepoApiResponse[]>(
        `${GITHUB_API_BASE}/users/${username}/repos`,
        {
            headers: getHeaders(),
            params: {
                per_page: MAX_REPOS_TO_ANALYZE,
                sort: 'updated',
                type: 'owner',
            },
        }
    );

    return data.filter((repo) => !repo.disabled);
}

async function fetchAccessibleReposGraphQL(username: string): Promise<IGitHubRepoApiResponse[]> {
    const { data } = await axios.post<IGitHubReposGraphQLResponse>(
        GITHUB_GRAPHQL_URL,
        {
            query: ACCESSIBLE_REPOS_QUERY,
            variables: { username, first: MAX_REPOS_TO_ANALYZE },
        },
        { headers: getHeaders() }
    );

    if (data.errors?.length) {
        throw new CustomError(data.errors[0].message, StatusCodes.BAD_GATEWAY);
    }

    const nodes = data.data.user?.repositories.nodes;

    if (!nodes) {
        throw new CustomError(`GitHub user "${username}" not found`, StatusCodes.NOT_FOUND);
    }

    return nodes
        .filter((node) => !node.isDisabled)
        .map(mapGraphQLRepoToApi);
}

async function fetchAccessibleRepos(username: string): Promise<IGitHubRepoApiResponse[]> {
    if (!serverConfig.GITHUB_TOKEN) {
        try {
            return await fetchPublicReposRest(username);
        } catch (error) {
            handleGitHubError(error, username);
        }
    }

    try {
        return await fetchAccessibleReposGraphQL(username);
    } catch (error) {
        if (error instanceof CustomError) {
            throw error;
        }

        try {
            return await fetchPublicReposRest(username);
        } catch (fallbackError) {
            handleGitHubError(fallbackError, username);
        }
    }
}

function buildTopLanguages(repos: IGitHubRepoResponse[]): ILanguageStat[] {
    const languageCounts = new Map<string, number>();

    for (const repo of repos) {
        if (!repo.language) continue;
        languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
    }

    return Array.from(languageCounts.entries())
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

function handleGitHubError(error: unknown, username: string): never {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === StatusCodes.NOT_FOUND) {
            throw new CustomError(`GitHub user "${username}" not found`, StatusCodes.NOT_FOUND);
        }

        if (status === StatusCodes.FORBIDDEN) {
            throw new CustomError(
                'GitHub API rate limit exceeded. Try again later or add a GITHUB_TOKEN.',
                StatusCodes.TOO_MANY_REQUESTS
            );
        }

        throw new CustomError(
            'Failed to fetch data from GitHub',
            status ?? StatusCodes.BAD_GATEWAY
        );
    }

    throw error;
}

async function runInBatches<T, R>(
    items: T[],
    batchSize: number,
    handler: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(handler));
        results.push(...batchResults);
    }

    return results;
}

async function fetchRepoReadmeMeta(
    owner: string,
    repo: string
): Promise<{ hasReadme: boolean; readmeLength: number }> {
    try {
        const { data } = await axios.get<{ content: string }>(
            `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
            { headers: getHeaders() }
        );

        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return { hasReadme: true, readmeLength: content.length };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === StatusCodes.NOT_FOUND) {
            return { hasReadme: false, readmeLength: 0 };
        }
        return { hasReadme: false, readmeLength: 0 };
    }
}

function mapRepoToDetail(
    repo: IGitHubRepoApiResponse,
    readmeMeta: { hasReadme: boolean; readmeLength: number }
): IGitHubRepoDetail {
    return {
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        watchers_count: repo.watchers_count,
        size: repo.size,
        fork: repo.fork,
        archived: repo.archived,
        disabled: repo.disabled,
        has_wiki: repo.has_wiki,
        has_pages: repo.has_pages,
        homepage: repo.homepage,
        topics: repo.topics ?? [],
        license: repo.license,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        created_at: repo.created_at,
        default_branch: repo.default_branch,
        hasReadme: readmeMeta.hasReadme,
        readmeLength: readmeMeta.readmeLength,
        isPrivate: repo.private ?? false,
    };
}

function getHeatmapDateRange(period: HeatmapPeriod): { from: string; to: string } {
    const now = new Date();

    const to = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23, 59, 59
    ));

    let from: Date;

    if (period === 'currWeek') {
        const dayOfWeek = now.getUTCDay();
        from = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - dayOfWeek
        ));
    } else if (period === 'currMonth') {
        from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    } else {
        from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }

    return {
        from: from.toISOString(),
        to: to.toISOString(),
    };
}

function parseHeatmapPeriod(period: string): HeatmapPeriod {
    if (HEATMAP_PERIODS.includes(period as HeatmapPeriod)) {
        return period as HeatmapPeriod;
    }

    throw new CustomError(
        `Invalid period "${period}". Must be one of: ${HEATMAP_PERIODS.join(', ')}`,
        StatusCodes.BAD_REQUEST
    );
}

async function fetchUser(username: string): Promise<IGitHubUserResponse> {
    try {
        const { data } = await axios.get<IGitHubUserResponse>(
            `${GITHUB_API_BASE}/users/${username}`,
            { headers: getHeaders() }
        );
        return data;
    } catch (error) {
        handleGitHubError(error, username);
    }
}

async function fetchUserRepos(username: string): Promise<IGitHubRepoResponse[]> {
    try {
        const repos = await fetchAccessibleRepos(username);
        return repos.map((repo) => ({
            language: repo.language,
            stargazers_count: repo.stargazers_count,
        }));
    } catch (error) {
        handleGitHubError(error, username);
    }
}

async function fetchDetailedRepos(username: string): Promise<IGitHubRepoDetail[]> {
    let repos: IGitHubRepoApiResponse[];

    try {
        repos = await fetchAccessibleRepos(username);
    } catch (error) {
        handleGitHubError(error, username);
    }

    const ownedRepos = repos.filter((repo) => !repo.fork);
    const readmeTargets = [...ownedRepos]
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, MAX_README_CHECKS);

    const readmeMetaList = await runInBatches(
        readmeTargets,
        README_CONCURRENCY,
        (repo) => {
            const [owner, repoName] = repo.full_name.split('/');
            return fetchRepoReadmeMeta(owner, repoName);
        }
    );

    const readmeMap = new Map<string, { hasReadme: boolean; readmeLength: number }>();
    readmeTargets.forEach((repo, index) => {
        readmeMap.set(repo.full_name, readmeMetaList[index]);
    });

    return repos.map((repo) =>
        mapRepoToDetail(
            repo,
            readmeMap.get(repo.full_name) ?? { hasReadme: false, readmeLength: 0 }
        )
    );
}

async function fetchContributionHeatmap(
    username: string,
    period: HeatmapPeriod
): Promise<IContributionHeatmap> {
    const { from, to } = getHeatmapDateRange(period);

    try {
        const { data } = await axios.post<IGitHubContributionGraphQLResponse>(
            GITHUB_GRAPHQL_URL,
            {
                query: CONTRIBUTION_HEATMAP_QUERY,
                variables: { username, from, to },
            },
            { headers: getHeaders() }
        );

        if (data.errors?.length) {
            throw new CustomError(
                data.errors[0].message,
                StatusCodes.BAD_GATEWAY
            );
        }

        const collection = data.data.user?.contributionsCollection;

        if (!collection) {
            throw new CustomError(`GitHub user "${username}" not found`, StatusCodes.NOT_FOUND);
        }

        const calendar = collection.contributionCalendar;
        const privateContributions = collection.restrictedContributionsCount ?? 0;

        const days = calendar.weeks.flatMap((week) =>
            week.contributionDays.map((day) => ({
                date: day.date,
                count: day.contributionCount,
            }))
        );

        return {
            githubUsername: username,
            period,
            from,
            to,
            totalContributions: calendar.totalContributions,
            days,
            includesPrivateContributions: privateContributions > 0,
            privateContributions,
        };
    } catch (error) {
        if (error instanceof CustomError) throw error;
        handleGitHubError(error, username);
    }
}

async function analyzeProfile(username: string): Promise<IProfileInsights> {
    const [user, repos] = await Promise.all([
        fetchUser(username),
        fetchUserRepos(username),
    ]);

    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    return {
        githubUsername: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        location: user.location,
        company: user.company,
        blog: user.blog,
        twitterUsername: user.twitter_username,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
        totalStars,
        topLanguages: buildTopLanguages(repos),
        accountCreatedAt: user.created_at ? new Date(user.created_at) : null,
    };
}

export default {
    analyzeProfile,
    fetchDetailedRepos,
    fetchContributionHeatmap,
    parseHeatmapPeriod,
};
