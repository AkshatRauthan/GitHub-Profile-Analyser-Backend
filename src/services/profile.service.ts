import { CustomError } from '@errors';
import { StatusCodes } from 'http-status-codes';
import { githubService } from '@services';
import { profileRepository } from '@repositories';
import { profileSearchHelpers, repoCompositionHelpers } from '@helpers';
import {
    IGitHubProfile,
    IGitHubAnalysisRequest,
    IContributionHeatmap,
    IRepoComposition,
    IPaginationQuery,
    IProfileSearchQuery,
    IProfileSearchResult,
    IPaginatedResult,
} from '@types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function resolvePagination(query: IPaginationQuery): { page: number; limit: number } {
    const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
    const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    return { page, limit };
}

async function analyzeGitHubProfile(
    userId: string,
    githubUsername: string
): Promise<IGitHubProfile> {
    try {
        const insights = await githubService.analyzeProfile(githubUsername);
        const profile = await profileRepository.upsertProfile(userId, insights);

        await profileRepository.createAnalysisRequest({
            userId,
            githubUsername: insights.githubUsername,
            profileId: profile.id,
            status: 'success',
        });

        return profile;
    } catch (error) {
        const message = error instanceof CustomError
            ? error.message
            : 'Failed to analyze GitHub profile';

        await profileRepository.createAnalysisRequest({
            userId,
            githubUsername,
            status: 'failed',
            errorMessage: message,
        });

        throw error;
    }
}

async function getUserProfiles(
    userId: string,
    query: IPaginationQuery
): Promise<IPaginatedResult<IGitHubProfile>> {
    const { page, limit } = resolvePagination(query);
    return profileRepository.findAllByUserId(userId, page, limit);
}

async function searchUserProfiles(
    userId: string,
    query: IProfileSearchQuery
): Promise<IProfileSearchResult> {
    const { page, limit } = resolvePagination(query);
    const filters = profileSearchHelpers.parseSearchQuery(query);
    return profileRepository.searchProfiles(userId, filters, page, limit);
}

async function getUserProfile(
    userId: string,
    githubUsername: string
): Promise<IGitHubProfile> {
    const profile = await profileRepository.findByUsername(userId, githubUsername);

    if (!profile) {
        throw new CustomError(
            `No analyzed profile found for "${githubUsername}"`,
            StatusCodes.NOT_FOUND
        );
    }

    return profile;
}

async function getUserAnalysisRequests(
    userId: string,
    query: IPaginationQuery
): Promise<IPaginatedResult<IGitHubAnalysisRequest>> {
    const { page, limit } = resolvePagination(query);
    return profileRepository.findRequestsByUserId(userId, page, limit);
}

async function getContributionHeatmap(
    githubUsername: string,
    period: string
): Promise<IContributionHeatmap> {
    const parsedPeriod = githubService.parseHeatmapPeriod(period);
    return githubService.fetchContributionHeatmap(githubUsername, parsedPeriod);
}

async function getRepoComposition(githubUsername: string): Promise<IRepoComposition> {
    const repos = await githubService.fetchDetailedRepos(githubUsername);
    return repoCompositionHelpers.buildRepoComposition(githubUsername, repos);
}

export default {
    analyzeGitHubProfile,
    getUserProfiles,
    searchUserProfiles,
    getUserProfile,
    getUserAnalysisRequests,
    getContributionHeatmap,
    getRepoComposition,
};
