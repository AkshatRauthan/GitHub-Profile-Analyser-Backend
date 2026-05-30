import { CustomError } from '@errors';
import { StatusCodes } from 'http-status-codes';
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
): Response {
    console.error(`❌ [Error] ${err.message}`);

    // Our own thrown errors
    if (err instanceof CustomError) {
        return res.status(err.statusCode!).json({
            success: false,
            message: err.message,
            explanation: err.explanation,
        });
    }

    // Prisma errors
    if (err.code === 'P2002') {
        return res.status(StatusCodes.CONFLICT).json({
            success: false,
            message: 'A record with this value already exists',
            explanation: err.meta?.target,
        });
    }

    if (err.code === 'P2025') {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: 'Record not found',
            explanation: err.meta?.cause,
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid token',
            explanation: err.message,
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Token expired',
            explanation: err.message,
        });
    }

    // Fallback
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
        explanation: err.message,
    });
}