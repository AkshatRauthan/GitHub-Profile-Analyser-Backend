import express, { Router, Request, Response } from 'express';
import { prisma } from '@config';

const router: Router = express.Router();

const SERVICE_NAME = 'github-profile-analyser-api';
const startedAt = Date.now();

async function getDatabaseStatus(): Promise<'connected' | 'disconnected'> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return 'connected';
    } catch {
        return 'disconnected';
    }
}

router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        service: SERVICE_NAME,
        status: 'ok',
        health: '/health',
        api: '/api/v1',
    });
});

router.get('/health', async (_req: Request, res: Response) => {
    const database = await getDatabaseStatus();

    res.status(200).json({
        status: database === 'connected' ? 'healthy' : 'degraded',
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: new Date(startedAt).toISOString(),
        checks: {
            database,
        },
    });
});

export default router;
