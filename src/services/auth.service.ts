import jwt from "jsonwebtoken";
import { CustomError } from "@errors";
import { serverConfig } from "@config";
import { bcryptHelpers } from "@helpers";
import { authRepository } from "@repositories";
import { StatusCodes } from 'http-status-codes';
import {
    IUser, IAuthTokens, ITokenPayload, IGoogleAuthPayload,
    IRegisterRequest, ILoginRequest, IUpdateRequest
} from "@types"


/**
 * Generate access + refresh token pair
 */
function generateTokens(user: IUser): IAuthTokens {
    const payload: ITokenPayload = {
        userId: String(user.id),
        email: user.email,
        username: user.username
    };

    const accessToken = jwt.sign(payload, serverConfig.JWT_SECRET, {
        expiresIn: serverConfig.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, serverConfig.JWT_SECRET, {
        expiresIn: serverConfig.REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
}


/**
 * Register with email/password
 */
async function registerUser(userData: IRegisterRequest): Promise<{ user: IUser; tokens: IAuthTokens }> {
    const existingUser = await authRepository.findByEmail(userData.email);
    if (existingUser) {
        throw new CustomError('Email already registered', StatusCodes.CONFLICT);
    }

    const user = await authRepository.register({
        username: userData.username,
        email: userData.email,
        password: await bcryptHelpers.hashPassword(userData.password),
        authMethods: ['local'],
        createdAt: new Date(),
        updatedAt: new Date()
    })

    const tokens = generateTokens(user);
    return { user, tokens };
}


/**
 * Update with email/password
 */
async function updateUser(updateDataReq: IUpdateRequest): Promise<IUser> {
    const user = await authRepository.findByEmail(updateDataReq.userId);
    if (!user) {
        throw new CustomError('Invalid email or password', StatusCodes.UNAUTHORIZED);
    }
    if (!user.password) {
        throw new CustomError(
            'This account uses Google OAuth login. Please set a password first.',
            StatusCodes.UNAUTHORIZED
        );
    }

    const isMatch = await bcryptHelpers.comparePassword(updateDataReq.currPassword, user.password);
    if (!isMatch) {
        throw new CustomError('Invalid email or password', StatusCodes.UNAUTHORIZED);
    }

    const updatedUser = await authRepository.update(updateDataReq.userId, {
        ...(updateDataReq.newEmail && { email: updateDataReq.newEmail }),
        ...(updateDataReq.newUsername && { username: updateDataReq.newUsername }),
        ...(updateDataReq.newPassword && { password: await bcryptHelpers.hashPassword(updateDataReq.newPassword) })
    })
    return updatedUser;
}


/**
 * Login with email/password
 */
async function loginUser(data: ILoginRequest): Promise<{ user: IUser; tokens: IAuthTokens }> {
    const user = await authRepository.findByEmail(data.email);
    if (!user) {
        throw new CustomError('Invalid email or password', StatusCodes.UNAUTHORIZED);
    }

    if (!user.password) {
        throw new CustomError(
            'This account uses Google OAuth login. Please use Google to sign in, or set a password first.',
            StatusCodes.UNAUTHORIZED
        );
    }

    const isMatch = await bcryptHelpers.comparePassword(data.password, user.password);
    if (!isMatch) {
        throw new CustomError('Invalid email or password', StatusCodes.UNAUTHORIZED);
    }

    const tokens = generateTokens(user);
    return { user, tokens };
}


/**
 * Handle Google OAuth — links to existing account or creates new
 */
async function handleGoogleAuth(payload: IGoogleAuthPayload): Promise<{ user: IUser; tokens: IAuthTokens }> {
    let user = await authRepository.findByGoogleId(payload.googleId);
    if (user) {
        // Existing Google OAuth user — just sign in
        const tokens = generateTokens(user);
        return { user, tokens };
    }

    user = await authRepository.findByEmail(payload.email);
    if (user) {
        // Existing Account But No OAuth — link OAuth with account
        user.googleId = payload.googleId;
        if (!user.authMethods.includes('google')) {
            user.authMethods.push('google');
        }
        await authRepository.update(user.id, user);

        const tokens = generateTokens(user);
        return { user, tokens };
    }

    // Create new user via Google
    user = await authRepository.register({
        email: payload.email.toLowerCase(),
        username: payload.name,
        googleId: payload.googleId,
        authMethods: ['google'],
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const tokens = generateTokens(user);
    return { user, tokens };
}


/**
 * Set password for an OAuth-only account
 */
async function setPassword(userId: string, password: string): Promise<IUser> {
    const user = await authRepository.findById(userId);
    if (!user) {
        throw new CustomError('User not found', StatusCodes.NOT_FOUND);
    }

    user.password = await bcryptHelpers.hashPassword(password);
    if (!user.authMethods.includes('local')) {
        user.authMethods.push('local');
    }
    await authRepository.update(user.id, user);
    
    return user;
}


/**
 * Link Google account to an existing local account
 */
async function linkGoogleAccount(userId: string, googlePayload: IGoogleAuthPayload): Promise<IUser> {
    const user = await authRepository.findById(userId);
    if (!user) {
        throw new CustomError('User not found', StatusCodes.NOT_FOUND);
    }

    // Check if googleId is already linked to another account
    const existingGoogleUser = await authRepository.findByGoogleId(googlePayload.googleId);
    if (existingGoogleUser && existingGoogleUser.id?.toString() !== userId) {
        throw new CustomError(
            'This Google account is already linked to another user',
            StatusCodes.CONFLICT
        );
    }

    user.googleId = googlePayload.googleId;
    if (!user.authMethods.includes('google')) {
        user.authMethods.push('google');
    }
    await authRepository.update(user.id, user); 

    return user;
}


/**
 * Refresh access token
 */
async function refreshToken(refreshToken: string): Promise<IAuthTokens> {
    try {
        const decoded = jwt.verify(
            refreshToken,
            serverConfig.JWT_SECRET
        ) as ITokenPayload;

        const user = await authRepository.findById(decoded.userId);
        if (!user) {
            throw new CustomError('User not found', StatusCodes.UNAUTHORIZED);
        }

        return generateTokens(user);
    } catch (error) {
        throw new CustomError('Invalid refresh token', StatusCodes.UNAUTHORIZED);
    }
}


/**
 * Get user profile
 */
async function getProfile(userId: string): Promise<IUser> {
    const user = await authRepository.findById(userId);
    if (!user) {
        throw new CustomError('User not found', StatusCodes.NOT_FOUND);
    }
    return user;
}

export default {
    registerUser,
    loginUser,
    updateUser,
    handleGoogleAuth,
    setPassword,
    linkGoogleAccount,
    refreshToken,
    getProfile
}