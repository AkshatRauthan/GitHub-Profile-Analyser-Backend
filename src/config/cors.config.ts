import cors, { CorsOptions } from 'cors';
import { serverConfig } from "@config";

const allowedOrigins: string[] = [
    ...(serverConfig.CORS_ORIGINS
        ? serverConfig.CORS_ORIGINS.split(',').map((o) => o.trim())
        : []),
];

const corsConfig: CorsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

export default cors(corsConfig);