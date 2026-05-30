import dotenv from 'dotenv';
dotenv.config();

interface ServerConfig {
    PORT: string;
    CORS_ORIGINS: string;
    FRONTEND_URL: string;

    JWT_SECRET: string;
    COOKIE_SECRET: string;

    ACCESS_TOKEN_EXPIRY: string;
    REFRESH_TOKEN_EXPIRY: string;

    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_CALLBACK_URL: string;

    GITHUB_TOKEN: string;
}

const serverConfig: ServerConfig = {
    PORT: process.env.PORT || '3000',
    CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    COOKIE_SECRET: process.env.COOKIE_SECRET || 'your-cookie-secret',

    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '3600',
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '86400',

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',

    GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
};

export default serverConfig;
