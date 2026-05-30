import { PrismaClient } from '../generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const MAX_DB_RETRIES = 2;
const RETRYABLE_ERROR_CODES = new Set(['P1001', 'P1002', 'P1017']);

function isRetryableDbError(error: unknown): boolean {
    if (error instanceof PrismaClientKnownRequestError) {
        return RETRYABLE_ERROR_CODES.has(error.code);
    }

    if (error instanceof Error) {
        return error.message.includes("Can't reach database server");
    }

    return false;
}

async function reconnectDb(client: PrismaClient): Promise<void> {
    try {
        await client.$disconnect();
    } catch {
        // Ignore disconnect errors on a dead connection.
    }

    await client.$connect();
}

function createPrismaClient(): PrismaClient {
    const baseClient = new PrismaClient({ log: ['error'] });

    return baseClient.$extends({
        query: {
            $allOperations({ args, query }) {
                return runWithDbRetry(() => query(args));
            },
        },
    }) as unknown as PrismaClient;
}

async function runWithDbRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_DB_RETRIES; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (!isRetryableDbError(error) || attempt === MAX_DB_RETRIES) {
                throw error;
            }

            await reconnectDb(prisma);
        }
    }

    throw lastError;
}

export const prisma =
    globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function connectDB(): Promise<void> {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected');
}

export { connectDB, runWithDbRetry };
export default prisma;
