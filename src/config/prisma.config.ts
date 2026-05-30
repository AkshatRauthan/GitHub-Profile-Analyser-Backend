import { PrismaClient } from '../generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function connectDB(): Promise<void> {
    await prisma.$connect();
    console.log('✅ Database connected');
}

export { connectDB };
export default prisma;