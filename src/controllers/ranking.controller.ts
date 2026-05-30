import { Request, Response, NextFunction } from 'express';
import { SuccessResponse } from '@common';
import { rankingService } from '@services';
import { StatusCodes } from 'http-status-codes';

async function getPersonas(_req: Request, res: Response, next: NextFunction) {
    try {
        const personas = rankingService.getPersonas();
        new SuccessResponse('Personas retrieved successfully', personas).send(res);
    } catch (error) {
        next(error);
    }
}

async function rankProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const username = String(req.params.username);

        const result = await rankingService.rankProfile(userId, username);
        new SuccessResponse(
            'Profile ranked successfully across all personas',
            result,
            StatusCodes.CREATED
        ).send(res);
    } catch (error) {
        next(error);
    }
}

async function getProfileRankings(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const username = String(req.params.username);

        const result = await rankingService.getProfileRankings(userId, username);
        new SuccessResponse('Profile rankings retrieved successfully', result).send(res);
    } catch (error) {
        next(error);
    }
}

async function getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const result = await rankingService.getLeaderboard(userId, {
            persona: String(req.query.persona || ''),
            page: req.query.page ? Number(req.query.page) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            minScore: req.query.minScore ? Number(req.query.minScore) : undefined,
        });

        new SuccessResponse('Leaderboard retrieved successfully', result).send(res);
    } catch (error) {
        next(error);
    }
}

export default {
    getPersonas,
    rankProfile,
    getProfileRankings,
    getLeaderboard,
};
