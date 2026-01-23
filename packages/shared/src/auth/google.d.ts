/**
 * Google OAuth Service
 * Handles Google Sign-In verification and user management
 */
export declare const GOOGLE_CONFIG: {
    clientId: string;
    tokenInfoUrl: string;
};
export interface GoogleUserInfo {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    picture: string;
    given_name?: string;
    family_name?: string;
}
export interface GoogleAuthResult {
    success: boolean;
    message: string;
    userId?: string;
    isNewUser?: boolean;
    user?: {
        id: string;
        email: string;
        name: string | null;
        picture: string | null;
        profileComplete: boolean;
    };
}
/**
 * Verify Google ID token and extract user info
 */
export declare function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null>;
/**
 * Authenticate user with Google - creates or updates user record
 */
export declare function authenticateWithGoogle(idToken: string): Promise<GoogleAuthResult>;
