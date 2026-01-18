/**
 * Google OAuth Service
 * Handles Google Sign-In verification and user management
 */

import { prisma } from '../db/prisma';

// Google OAuth configuration
export const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  // Token verification endpoint
  tokenInfoUrl: 'https://oauth2.googleapis.com/tokeninfo',
};

export interface GoogleUserInfo {
  sub: string;        // Google user ID
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
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  try {
    // Verify token with Google
    const response = await fetch(`${GOOGLE_CONFIG.tokenInfoUrl}?id_token=${idToken}`);
    
    if (!response.ok) {
      console.error('[Google] Token verification failed:', response.status);
      return null;
    }

    const payload = await response.json() as GoogleUserInfo & { aud?: string; error?: string };

    // Check for errors
    if (payload.error) {
      console.error('[Google] Token error:', payload.error);
      return null;
    }

    // Verify the token was intended for our app
    if (GOOGLE_CONFIG.clientId && payload.aud !== GOOGLE_CONFIG.clientId) {
      console.error('[Google] Token audience mismatch');
      return null;
    }

    // Verify email is verified
    if (!payload.email_verified) {
      console.error('[Google] Email not verified');
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    };
  } catch (error: any) {
    console.error('[Google] Error verifying token:', error.message);
    return null;
  }
}

/**
 * Authenticate user with Google - creates or updates user record
 */
export async function authenticateWithGoogle(idToken: string): Promise<GoogleAuthResult> {
  // Verify the token
  const googleUser = await verifyGoogleToken(idToken);

  if (!googleUser) {
    return {
      success: false,
      message: 'Invalid or expired Google token',
    };
  }

  // Check if user exists by Google ID or email
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId: googleUser.sub },
        { email: googleUser.email },
      ],
    },
  });

  const isNewUser = !user;

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        googleId: googleUser.sub,
        profileComplete: true, // Google provides name, so profile is complete
      },
    });
  } else {
    // Update existing user with latest Google info
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: googleUser.sub,
        name: user.name || googleUser.name,
        picture: googleUser.picture,
        lastLoginAt: new Date(),
        profileComplete: true,
      },
    });
  }

  return {
    success: true,
    message: isNewUser ? 'Account created successfully' : 'Login successful',
    userId: user.id,
    isNewUser,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      profileComplete: user.profileComplete,
    },
  };
}
