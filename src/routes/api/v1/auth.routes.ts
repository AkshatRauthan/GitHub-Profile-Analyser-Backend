import express, { Router } from 'express';
import { authController } from "@controllers";
import { authMiddlewares } from '@middlewares';

const router: Router = express.Router();


// Public routes
router.post(
    '/register', 
    authController.registerUser
);

router.post(
    '/login', 
    authController.loginUser
);

router.post(
    '/google',
    authController.googleAuth
);

router.get(
    '/google',
    authController.
    googleOAuthRedirect
);

router.get(
    '/google/callback', 
    authController.handleGoogleOauthCallback
);

router.post(
    '/refresh',
    authController.refreshToken
);


// Protected routes
router.get(
    '/profile', 
    authMiddlewares.authenticateUser, 
    authController.getProfile
);

router.put(
    '/profile', 
    authMiddlewares.authenticateUser, 
    authController.updateProfile
);

router.post(
    '/set-password', 
    authMiddlewares.authenticateUser, 
    authController.setPassword
);

router.post(
    '/link-google', 
    authMiddlewares.authenticateUser, 
    authController.linkGoogleAccount
);

export default router;