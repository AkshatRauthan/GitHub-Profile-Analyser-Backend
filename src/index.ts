import app from './app';
import { connectDB, serverConfig } from "@config";

const HOST = process.env.HOST || '0.0.0.0';
const PORT: number = serverConfig.PORT ? parseInt(serverConfig.PORT, 10) : 7860;

app.listen(PORT, HOST, () => {
    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`✅ Health check: http://${HOST}:${PORT}/health`);
});

connectDB()
    .then(() => {
        console.log('✅ Database connected');
    })
    .catch((error: unknown) => {
        console.error('❌ Failed to connect to the database:', error);
        console.warn('⚠️  Server started in degraded mode — /health reports database: disconnected');
    });
