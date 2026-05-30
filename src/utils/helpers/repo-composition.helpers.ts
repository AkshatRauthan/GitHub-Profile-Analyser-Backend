import { IGitHubRepoDetail } from '@types';

export type RepoCompositionDimension = 'languages' | 'technologies' | 'frameworks' | 'repoTypes';

export interface ICompositionSlice {
    label: string;
    count: number;
    percentage: number;
}

export interface IRepoComposition {
    githubUsername: string;
    totalRepos: number;
    languages: ICompositionSlice[];
    technologies: ICompositionSlice[];
    frameworks: ICompositionSlice[];
    repoTypes: ICompositionSlice[];
    includesPrivateRepos?: boolean;
    privateRepoCount?: number;
}

const FRAMEWORK_TOPICS = new Set([
    'react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte', 'sveltekit', 'remix',
    'django', 'fastapi', 'flask', 'spring', 'spring-boot', 'express', 'nestjs',
    'rails', 'laravel', 'flutter', 'react-native', 'swiftui', 'kotlin-multiplatform',
    'gatsby', 'astro', 'vite', 'webpack', 'electron', 'expo',
]);

const TECHNOLOGY_TOPICS = new Set([
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'helm', 'aws', 'azure', 'gcp',
    'graphql', 'redis', 'mongodb', 'postgresql', 'mysql', 'kafka', 'rabbitmq', 'grpc',
    'tensorflow', 'pytorch', 'machine-learning', 'deep-learning', 'nlp', 'llm',
    'ci-cd', 'github-actions', 'microservices', 'serverless', 'blockchain', 'solidity',
    'opencv', 'pandas', 'numpy', 'huggingface', 'data-science', 'monitoring', 'prometheus',
]);

function toPercentage(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 1000) / 10;
}

function buildSlices(counts: Map<string, number>, total: number, maxSlices = 8): ICompositionSlice[] {
    const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({
            label,
            count,
            percentage: toPercentage(count, total),
        }));

    if (sorted.length <= maxSlices) return sorted;

    const top = sorted.slice(0, maxSlices - 1);
    const otherCount = sorted.slice(maxSlices - 1).reduce((sum, item) => sum + item.count, 0);

    return [
        ...top,
        {
            label: 'Other',
            count: otherCount,
            percentage: toPercentage(otherCount, total),
        },
    ];
}

function classifyRepoType(repo: IGitHubRepoDetail): string {
    if (repo.archived) return 'Archived';
    if (repo.fork) return 'Fork';
    if (repo.has_pages) return 'GitHub Pages';
    return 'Original';
}

function pickTopicMatch(topics: string[], catalog: Set<string>): string | null {
    const normalized = topics.map((t) => t.toLowerCase());
    for (const topic of normalized) {
        if (catalog.has(topic)) return topic;
    }
    return null;
}

function buildLanguageComposition(repos: IGitHubRepoDetail[]): ICompositionSlice[] {
    const counts = new Map<string, number>();
    for (const repo of repos) {
        const label = repo.language?.trim() || 'Unknown';
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return buildSlices(counts, repos.length);
}

function buildTopicComposition(
    repos: IGitHubRepoDetail[],
    catalog: Set<string>,
    noneLabel = 'None detected'
): ICompositionSlice[] {
    const counts = new Map<string, number>();
    let withoutMatch = 0;

    for (const repo of repos) {
        const match = pickTopicMatch(repo.topics, catalog);
        if (match) {
            const label = match.charAt(0).toUpperCase() + match.slice(1);
            counts.set(label, (counts.get(label) ?? 0) + 1);
        } else {
            withoutMatch += 1;
        }
    }

    if (withoutMatch > 0) {
        counts.set(noneLabel, withoutMatch);
    }

    return buildSlices(counts, repos.length);
}

function buildRepoTypeComposition(repos: IGitHubRepoDetail[]): ICompositionSlice[] {
    const counts = new Map<string, number>();
    for (const repo of repos) {
        const label = classifyRepoType(repo);
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return buildSlices(counts, repos.length, 6);
}

function buildRepoComposition(githubUsername: string, repos: IGitHubRepoDetail[]): IRepoComposition {
    const privateRepoCount = repos.filter((repo) => repo.isPrivate).length;
    return {
        githubUsername,
        totalRepos: repos.length,
        languages: buildLanguageComposition(repos),
        technologies: buildTopicComposition(repos, TECHNOLOGY_TOPICS),
        frameworks: buildTopicComposition(repos, FRAMEWORK_TOPICS),
        repoTypes: buildRepoTypeComposition(repos),
        includesPrivateRepos: privateRepoCount > 0,
        privateRepoCount,
    };
}

export default {
    buildRepoComposition,
};
