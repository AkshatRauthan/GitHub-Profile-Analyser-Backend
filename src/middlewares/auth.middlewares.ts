import jwt from 'jsonwebtoken';
import { CustomError } from "@errors";
import { serverConfig } from '@config';
import { ITokenPayload } from '@types';
import { authRepository } from '@repositories';
import { StatusCodes } from 'http-status-codes';
import { Request, Response, NextFunction } from 'express';

async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new CustomError('Access token is required', StatusCodes.UNAUTHORIZED));
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, serverConfig.JWT_SECRET) as ITokenPayload;

        const user = await authRepository.findById(decoded.userId);
        if (!user) {
            return next(new CustomError('User no longer exists', StatusCodes.UNAUTHORIZED));
        }

        req.user = {
            id: decoded.userId,
            email: decoded.email,
            username: decoded.username,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new CustomError('Token expired', StatusCodes.UNAUTHORIZED));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new CustomError('Invalid token', StatusCodes.UNAUTHORIZED));
        }
        next(error);
    }
}

export default { authenticateUser };