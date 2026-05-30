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

const CONTRIBUTION_HEATMAP_QUERY = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
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

function getHeaders() {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
    };

    if (serverConfig.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${serverConfig.GITHUB_TOKEN}`;
    }

    return headers;
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
        const { data } = await axios.get<IGitHubRepoResponse[]>(
            `${GITHUB_API_BASE}/users/${username}/repos`,
            {
                headers: getHeaders(),
                params: { per_page: 100, sort: 'updated', type: 'owner' },
            }
        );
        return data;
    } catch (error) {
        handleGitHubError(error, username);
    }
}

async function fetchDetailedRepos(username: string): Promise<IGitHubRepoDetail[]> {
    let repos: IGitHubRepoApiResponse[];

    try {
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
        repos = data.filter((repo) => !repo.disabled);
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

        const calendar = data.data.user?.contributionsCollection.contributionCalendar;

        if (!calendar) {
            throw new CustomError(`GitHub user "${username}" not found`, StatusCodes.NOT_FOUND);
        }

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
