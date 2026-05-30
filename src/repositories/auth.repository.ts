import { IUser } from '@types';
import { prisma } from '@config';

function parseUser(rawUser: any): IUser {
    return { ...rawUser, authMethods: JSON.parse(rawUser.authMethods) as ('local' | 'google')[] };
}

async function register(userData: Omit<IUser, 'id'>): Promise<IUser> {
    const user = await prisma.user.create({
        data: {...userData, authMethods: JSON.stringify(userData.authMethods)}
    })
    return parseUser(user);
}

async function findById(id: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? parseUser(user) : null;
}

async function findByEmail(email: string): Promise<IUser | null>{
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? parseUser(user) : null;
}

async function findByGoogleId(googleId: string): Promise<IUser | null>{
    const user = await prisma.user.findUnique({ where: { googleId } });
    return user ? parseUser(user) : null;
}

async function update(id: string, data: Partial<IUser>): Promise<IUser> {
    const { authMethods, ...userData } = data;
    const user = await prisma.user.update({
        where: { id },
        data: { ...userData, ...(data.authMethods && { authMethods: JSON.stringify(data.authMethods) })}
    })
    return parseUser(user);
}

async function deleteUser(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
}

export default {
    register,
    update,
    deleteUser,
    findByEmail,
    findById,
    findByGoogleId,
}