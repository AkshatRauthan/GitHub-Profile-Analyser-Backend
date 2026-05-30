import { Request, Response, NextFunction } from 'express';
import { SuccessResponse } from '@common';
import { profileService } from '@services';
import { StatusCodes } from 'http-status-codes';

async function analyzeProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const username = String(req.params.username);

        const profile = await profileService.analyzeGitHubProfile(userId, username);
        new SuccessResponse(
            'GitHub profile analyzed successfully',
            profile,
            StatusCodes.CREATED
        ).send(res);
    } catch (error) {
        next(error);
    }
}

async function getAllProfiles(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const result = await profileService.getUserProfiles(userId, req.query);

        new SuccessResponse('Profiles retrieved successfully', result).send(res);
    } catch (error) {
        next(error);
    }
}

async function searchProfiles(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const result = await profileService.searchUserProfiles(userId, req.query);

        new SuccessResponse('Profile search completed successfully', result).send(res);
    } catch (error) {
        next(error);
    }
}

async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const username = String(req.params.username);

        const profile = await profileService.getUserProfile(userId, username);
        new SuccessResponse('Profile retrieved successfully', profile).send(res);
    } catch (error) {
        next(error);
    }
}

async function getAnalysisRequests(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const result = await profileService.getUserAnalysisRequests(userId, req.query);

        new SuccessResponse('Analysis requests retrieved successfully', result).send(res);
    } catch (error) {
        next(error);
    }
}

async function getContributionHeatmap(req: Request, res: Response, next: NextFunction) {
    try {
        const username = String(req.params.username);
        const period = String(req.query.period || 'currYear');

        const heatmap = await profileService.getContributionHeatmap(username, period);
        new SuccessResponse('Contribution heatmap retrieved successfully', heatmap).send(res);
    } catch (error) {
        next(error);
    }
}

export default {
    analyzeProfile,
    getAllProfiles,
    searchProfiles,
    getProfile,
    getAnalysisRequests,
    getContributionHeatmap,
};
