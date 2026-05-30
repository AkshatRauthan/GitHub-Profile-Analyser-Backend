// User Model
export interface IUser {
    id: string;
    username: string;
    email: string;
    password?: string;
    googleId?: string;
    authMethods: ('local' | 'google')[];

    createdAt: Date;
    updatedAt: Date;
}

// Auth Token Types
export interface ITokenPayload {
    userId: string;
    email: string;
    username: string;
}

export interface IAuthTokens {
    accessToken: string;
    refreshToken: string;
}


// Auth Request Types
export interface IRegisterRequest {
    email: string;
    password: string;
    username: string;
}

export interface ILoginRequest {
    email: string;
    password: string;
}

export interface IUpdateRequest {
    userId: string;
    newEmail?: string;
    newPassword?: string;
    newUsername?: string;
    currPassword: string;
}

export interface IGoogleAuthPayload {
    googleId: string;
    email: string;
    name: string;
}

export interface ISetPasswordRequest {
    password: string;
}

export interface ILinkGoogleRequest {
    googleToken: string;
}