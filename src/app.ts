import express, { Application, Request, Response, NextFunction } from 'express';

import appRoutes from "@routes";
import healthRoutes from "@routes/health.routes";
import { corsConfig } from "@config";
import { StatusCodes } from 'http-status-codes';
import { errorHandler, CustomError } from '@errors';

const app: Application = express();


app.use(corsConfig);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(healthRoutes);

app.use(appRoutes);

app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new CustomError(
        `Route ${req.method} ${req.originalUrl} not found`,
        StatusCodes.NOT_FOUND
    ));
});

app.use(errorHandler);

export default app;