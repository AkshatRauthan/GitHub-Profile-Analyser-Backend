import { Request, Response, NextFunction } from 'express';
import { authService } from '@services';
import { SuccessResponse } from '@common';
import { StatusCodes } from 'http-status-codes';
import serverConfig from '@config/server.config';
import {
    IRegisterRequest, ILoginRequest, IGoogleAuthPayload,
    ISetPasswordRequest,
    IUpdateRequest,
} from '@types';


async function registerUser(req: Request, res: Response, next: NextFunction) {
    try {
        const data: IRegisterRequest = req.body;
        const result = await authService.registerUser(data);
        new SuccessResponse(
            'Registration successful',
            result,
            StatusCodes.CREATED
        ).send(res);
    } catch (error) {
        next(error);
    }
}


async function loginUser(req: Request, res: Response, next: NextFunction) {
    try {
        const data: ILoginRequest = req.body;
        const result = await authService.loginUser(data);
        new SuccessResponse('Login successful', result).send(res);
    } catch (error) {
        next(error);
    }
}


async function googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const data: IGoogleAuthPayload = req.body;
        const result = await authService.handleGoogleAuth(data);
        new SuccessResponse('Google authentication successful', result).send(res);
    } catch (error) {
        next(error);
    }
}


/**
 * GET /auth/google — Redirect user to Google's consent screen
 */
async function googleOAuthRedirect(_req: Request, res: Response, next: NextFunction) {
    try {
        const params = new URLSearchParams({
            client_id: serverConfig.GOOGLE_CLIENT_ID,
            redirect_uri: serverConfig.GOOGLE_CALLBACK_URL,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent',
        });
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        console.log(`🔐 [OAuth] Redirecting to Google consent screen`);
        res.redirect(googleAuthUrl);
    } catch (error) {
        next(error);
    }
}


/**
 * GET /auth/google/callback — Handle Google's redirect back with auth code
 */
async function handleGoogleOauthCallback(req: Request, res: Response, next: NextFunction) {
    try {
        const { code, error: oauthError } = req.query;

        if (oauthError || !code) {
            console.error(`❌ [OAuth] Google callback error: ${oauthError || 'no code'}`);
            return res.redirect(
                `${serverConfig.FRONTEND_URL}/login?error=${encodeURIComponent(String(oauthError || 'Google login failed'))}`
            );
        }

        console.log(`🔐 [OAuth] Received auth code, exchanging for tokens...`);

        // Exchange auth code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                client_id: serverConfig.GOOGLE_CLIENT_ID,
                client_secret: serverConfig.GOOGLE_CLIENT_SECRET,
                redirect_uri: serverConfig.GOOGLE_CALLBACK_URL,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.access_token) {
            console.error(`❌ [OAuth] Token exchange failed:`, tokenData);
            return res.redirect(
                `${serverConfig.FRONTEND_URL}/login?error=${encodeURIComponent('Failed to exchange Google auth code')}`
            );
        }

        // Fetch user profile from Google
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        if (!userInfoRes.ok || !userInfo.sub) {
            console.error(`❌ [OAuth] User info fetch failed:`, userInfo);
            return res.redirect(
                `${serverConfig.FRONTEND_URL}/login?error=${encodeURIComponent('Failed to fetch Google profile')}`
            );
        }

        console.log(`✅ [OAuth] Google user: ${userInfo.email} (${userInfo.name})`);

        // Use existing authService to create/link user
        const payload: IGoogleAuthPayload = {
            googleId: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
        };

        const result = await authService.handleGoogleAuth(payload);

        // Redirect to frontend with tokens in URL
        const params = new URLSearchParams({
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
        });

        res.redirect(`${serverConfig.FRONTEND_URL}/auth/callback?${params.toString()}`);
    } catch (error) {
        console.error(`❌ [OAuth] Unexpected error:`, error);
        next(error);
    }
}


async function setPassword(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const data: ISetPasswordRequest = req.body;
        await authService.setPassword(userId, data.password);
        new SuccessResponse('Password set successfully').send(res);
    } catch (error) {
        next(error);
    }
}


async function linkGoogleAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const data: IGoogleAuthPayload = req.body;
        await authService.linkGoogleAccount(userId, data);
        new SuccessResponse('Google account linked successfully').send(res);
    } catch (error) {
        next(error);
    }
}


async function refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshToken(refreshToken);
        new SuccessResponse('Token refreshed', result).send(res);
    } catch (error) {
        next(error);
    }
}


async function updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const data: IUpdateRequest = req.body;
        const user = await authService.updateUser(data);
        new SuccessResponse('Profile details updated', user).send(res);
    } catch (error) {
        next(error);
    }
}


async function getProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const user = await authService.getProfile(userId);
        new SuccessResponse('Profile retrieved', user).send(res);
    } catch (error) {
        next(error);
    }
}

export default {
    registerUser,
    loginUser,
    googleAuth,
    googleOAuthRedirect,
    handleGoogleOauthCallback,
    setPassword,
    linkGoogleAccount,
    refreshToken,
    updateProfile,
    getProfile,
}