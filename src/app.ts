import express, { Application, Request, Response, NextFunction } from 'express';

import appRoutes from "@routes";
import { corsConfig } from "@config";
import { StatusCodes } from 'http-status-codes';
import { errorHandler, CustomError } from '@errors';

const app: Application = express();


app.use(corsConfig);
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use(appRoutes);

app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new CustomError(
        `Route ${req.method} ${req.originalUrl} not found`,
        StatusCodes.NOT_FOUND
    ));
});

app.use(errorHandler);

export default app;