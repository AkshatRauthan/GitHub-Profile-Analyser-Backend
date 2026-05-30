import { PersonaKey, IPersonaDefinition, IMetricWeights } from '@types';

const METRIC_KEYS = [
    'languageAlignment',
    'repositoryQuality',
    'documentation',
    'activity',
    'communityImpact',
    'projectDepth',
    'techStackMatch',
    'profileCompleteness',
] as const;

function weights(partial: Partial<IMetricWeights>): IMetricWeights {
    const defaults: IMetricWeights = {
        languageAlignment: 0.10,
        repositoryQuality: 0.10,
        documentation: 0.10,
        activity: 0.10,
        communityImpact: 0.10,
        projectDepth: 0.10,
        techStackMatch: 0.10,
        profileCompleteness: 0.10,
    };

    const merged = { ...defaults, ...partial };
    const total = Object.values(merged).reduce((sum, w) => sum + w, 0);
    const normalized = {} as IMetricWeights;

    for (const key of METRIC_KEYS) {
        normalized[key] = merged[key] / total;
    }

    return normalized;
}

export const PERSONA_DEFINITIONS: Record<PersonaKey, IPersonaDefinition> = {
    frontend_developer: {
        key: 'frontend_developer',
        name: 'Frontend Developer',
        description: 'UI/UX-focused engineers building web interfaces with modern JS frameworks',
        languages: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Vue', 'Dart'],
        topics: ['react', 'vue', 'angular', 'frontend', 'nextjs', 'nuxt', 'svelte', 'tailwind', 'ui', 'ux', 'webpack', 'vite'],
        bioKeywords: ['frontend', 'front-end', 'ui', 'ux', 'react', 'vue', 'angular', 'web developer', 'css'],
        weights: weights({
            languageAlignment: 0.22,
            techStackMatch: 0.18,
            repositoryQuality: 0.15,
            documentation: 0.12,
            activity: 0.12,
            projectDepth: 0.10,
            communityImpact: 0.06,
            profileCompleteness: 0.05,
        }),
    },
    backend_developer: {
        key: 'backend_developer',
        name: 'Backend Developer',
        description: 'Server-side engineers building APIs, services, and data layers',
        languages: ['Python', 'Java', 'Go', 'Ruby', 'PHP', 'C#', 'Rust', 'Kotlin', 'Scala', 'Elixir'],
        topics: ['api', 'backend', 'microservices', 'rest', 'graphql', 'database', 'spring', 'django', 'fastapi', 'express', 'nestjs'],
        bioKeywords: ['backend', 'back-end', 'api', 'server', 'microservices', 'database', 'architect'],
        weights: weights({
            languageAlignment: 0.22,
            repositoryQuality: 0.18,
            projectDepth: 0.15,
            activity: 0.12,
            documentation: 0.12,
            techStackMatch: 0.10,
            communityImpact: 0.06,
            profileCompleteness: 0.05,
        }),
    },
    fullstack_developer: {
        key: 'fullstack_developer',
        name: 'Full Stack Developer',
        description: 'Engineers comfortable across frontend, backend, and deployment',
        languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Ruby', 'PHP', 'C#'],
        topics: ['fullstack', 'full-stack', 'mern', 'mean', 'nextjs', 'react', 'node', 'django', 'rails', 'api', 'frontend', 'backend'],
        bioKeywords: ['full stack', 'fullstack', 'full-stack', 'mern', 'mean', 'web developer'],
        weights: weights({
            languageAlignment: 0.15,
            repositoryQuality: 0.15,
            projectDepth: 0.15,
            techStackMatch: 0.14,
            activity: 0.12,
            documentation: 0.12,
            communityImpact: 0.10,
            profileCompleteness: 0.07,
        }),
    },
    ai_engineer: {
        key: 'ai_engineer',
        name: 'AI / ML Engineer',
        description: 'Engineers working on machine learning, deep learning, and AI systems',
        languages: ['Python', 'Jupyter Notebook', 'R', 'C++', 'Julia'],
        topics: ['machine-learning', 'deep-learning', 'pytorch', 'tensorflow', 'llm', 'nlp', 'computer-vision', 'ai', 'ml', 'data-science', 'huggingface'],
        bioKeywords: ['machine learning', 'deep learning', 'ai', 'ml', 'data science', 'nlp', 'computer vision', 'llm'],
        weights: weights({
            techStackMatch: 0.22,
            languageAlignment: 0.20,
            projectDepth: 0.15,
            documentation: 0.12,
            repositoryQuality: 0.10,
            activity: 0.10,
            communityImpact: 0.06,
            profileCompleteness: 0.05,
        }),
    },
    devops_engineer: {
        key: 'devops_engineer',
        name: 'DevOps Engineer',
        description: 'Infrastructure, CI/CD, cloud, and platform reliability engineers',
        languages: ['Go', 'Python', 'Shell', 'HCL', 'Dockerfile', 'YAML', 'Ruby'],
        topics: ['devops', 'kubernetes', 'docker', 'terraform', 'ansible', 'ci-cd', 'aws', 'azure', 'gcp', 'infrastructure', 'helm', 'monitoring'],
        bioKeywords: ['devops', 'sre', 'platform', 'infrastructure', 'kubernetes', 'cloud', 'ci/cd', 'terraform'],
        weights: weights({
            techStackMatch: 0.22,
            repositoryQuality: 0.16,
            documentation: 0.14,
            activity: 0.12,
            languageAlignment: 0.12,
            projectDepth: 0.10,
            communityImpact: 0.08,
            profileCompleteness: 0.06,
        }),
    },
    mobile_developer: {
        key: 'mobile_developer',
        name: 'Mobile Developer',
        description: 'iOS, Android, and cross-platform mobile application developers',
        languages: ['Swift', 'Kotlin', 'Dart', 'Java', 'Objective-C', 'JavaScript', 'TypeScript'],
        topics: ['android', 'ios', 'flutter', 'react-native', 'mobile', 'swiftui', 'kotlin', 'expo'],
        bioKeywords: ['mobile', 'android', 'ios', 'flutter', 'react native', 'swift', 'kotlin'],
        weights: weights({
            languageAlignment: 0.22,
            techStackMatch: 0.18,
            projectDepth: 0.15,
            repositoryQuality: 0.12,
            documentation: 0.10,
            activity: 0.10,
            communityImpact: 0.08,
            profileCompleteness: 0.05,
        }),
    },
};

export const PERSONA_KEYS = Object.keys(PERSONA_DEFINITIONS) as PersonaKey[];

export default PERSONA_DEFINITIONS;
