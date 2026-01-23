"use strict";
/**
 * Google OAuth Service
 * Handles Google Sign-In verification and user management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_CONFIG = void 0;
exports.verifyGoogleToken = verifyGoogleToken;
exports.authenticateWithGoogle = authenticateWithGoogle;
const prisma_1 = require("../db/prisma");
// Google OAuth configuration
exports.GOOGLE_CONFIG = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    // Token verification endpoint
    tokenInfoUrl: 'https://oauth2.googleapis.com/tokeninfo',
};
/**
 * Verify Google ID token and extract user info
 */
async function verifyGoogleToken(idToken) {
    try {
        // Verify token with Google
        const response = await fetch(`${exports.GOOGLE_CONFIG.tokenInfoUrl}?id_token=${idToken}`);
        if (!response.ok) {
            console.error('[Google] Token verification failed:', response.status);
            return null;
        }
        const payload = await response.json();
        // Check for errors
        if (payload.error) {
            console.error('[Google] Token error:', payload.error);
            return null;
        }
        // Verify the token was intended for our app
        if (exports.GOOGLE_CONFIG.clientId && payload.aud !== exports.GOOGLE_CONFIG.clientId) {
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
    }
    catch (error) {
        console.error('[Google] Error verifying token:', error.message);
        return null;
    }
}
/**
 * Authenticate user with Google - creates or updates user record
 */
async function authenticateWithGoogle(idToken) {
    // Verify the token
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
        return {
            success: false,
            message: 'Invalid or expired Google token',
        };
    }
    // Check if user exists by Google ID or email
    let user = await prisma_1.prisma.user.findFirst({
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
        user = await prisma_1.prisma.user.create({
            data: {
                email: googleUser.email,
                name: googleUser.name,
                picture: googleUser.picture,
                googleId: googleUser.sub,
                profileComplete: true, // Google provides name, so profile is complete
            },
        });
    }
    else {
        // Update existing user with latest Google info
        user = await prisma_1.prisma.user.update({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29vZ2xlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ29vZ2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQXNDSCw4Q0EyQ0M7QUFLRCx3REE2REM7QUFqSkQseUNBQXNDO0FBRXRDLDZCQUE2QjtBQUNoQixRQUFBLGFBQWEsR0FBRztJQUMzQixRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFO0lBQzVDLDhCQUE4QjtJQUM5QixZQUFZLEVBQUUseUNBQXlDO0NBQ3hELENBQUM7QUEwQkY7O0dBRUc7QUFDSSxLQUFLLFVBQVUsaUJBQWlCLENBQUMsT0FBZTtJQUNyRCxJQUFJLENBQUM7UUFDSCwyQkFBMkI7UUFDM0IsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxxQkFBYSxDQUFDLFlBQVksYUFBYSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRWxGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEUsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUF1RCxDQUFDO1FBRTNGLG1CQUFtQjtRQUNuQixJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0RCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCw0Q0FBNEM7UUFDNUMsSUFBSSxxQkFBYSxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsR0FBRyxLQUFLLHFCQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckUsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1lB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LENBQUMsRUFBRTtZQUNYLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsZUFBZSxFQUFFLElBQUksQ0FBQyxlQUFlO1NBQ3RDO0tBQ0YsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdvb2dsZSBPQXV0aCBTZXJ2aWNlXG4gKiBIYW5kbGVzIEdvb2dsZSBTaWduLUluIHZlcmlmaWNhdGlvbiBhbmQgdXNlciBtYW5hZ2VtZW50XG4gKi9cblxuaW1wb3J0IHsgcHJpc21hIH0gZnJvbSAnLi4vZGIvcHJpc21hJztcblxuLy8gR29vZ2xlIE9BdXRoIGNvbmZpZ3VyYXRpb25cbmV4cG9ydCBjb25zdCBHT09HTEVfQ09ORklHID0ge1xuICBjbGllbnRJZDogcHJvY2Vzcy5lbnYuR09PR0xFX0NMSUVOVF9JRCB8fCAnJyxcbiAgLy8gVG9rZW4gdmVyaWZpY2F0aW9uIGVuZHBvaW50XG4gIHRva2VuSW5mb1VybDogJ2h0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuaW5mbycsXG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIEdvb2dsZVVzZXJJbmZvIHtcbiAgc3ViOiBzdHJpbmc7ICAgICAgICAvLyBHb29nbGUgdXNlciBJRFxuICBlbWFpbDogc3RyaW5nO1xuICBlbWFpbF92ZXJpZmllZDogYm9vbGVhbjtcbiAgbmFtZTogc3RyaW5nO1xuICBwaWN0dXJlOiBzdHJpbmc7XG4gIGdpdmVuX25hbWU/OiBzdHJpbmc7XG4gIGZhbWlseV9uYW1lPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdvb2dsZUF1dGhSZXN1bHQge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIHVzZXJJZD86IHN0cmluZztcbiAgaXNOZXdVc2VyPzogYm9vbGVhbjtcbiAgdXNlcj86IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIGVtYWlsOiBzdHJpbmc7XG4gICAgbmFtZTogc3RyaW5nIHwgbnVsbDtcbiAgICBwaWN0dXJlOiBzdHJpbmcgfCBudWxsO1xuICAgIHByb2ZpbGVDb21wbGV0ZTogYm9vbGVhbjtcbiAgfTtcbn1cblxuLyoqXG4gKiBWZXJpZnkgR29vZ2xlIElEIHRva2VuIGFuZCBleHRyYWN0IHVzZXIgaW5mb1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdmVyaWZ5R29vZ2xlVG9rZW4oaWRUb2tlbjogc3RyaW5nKTogUHJvbWlzZTxHb29nbGVVc2VySW5mbyB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICAvLyBWZXJpZnkgdG9rZW4gd2l0aCBHb29nbGVcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke0dPT0dMRV9DT05GSUcudG9rZW5JbmZvVXJsfT9pZF90b2tlbj0ke2lkVG9rZW59YCk7XG4gICAgXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgY29uc29sZS5lcnJvcignW0dvb2dsZV0gVG9rZW4gdmVyaWZpY2F0aW9uIGZhaWxlZDonLCByZXNwb25zZS5zdGF0dXMpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKSBhcyBHb29nbGVVc2VySW5mbyAmIHsgYXVkPzogc3RyaW5nOyBlcnJvcj86IHN0cmluZyB9O1xuXG4gICAgLy8gQ2hlY2sgZm9yIGVycm9yc1xuICAgIGlmIChwYXlsb2FkLmVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbR29vZ2xlXSBUb2tlbiBlcnJvcjonLCBwYXlsb2FkLmVycm9yKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFZlcmlmeSB0aGUgdG9rZW4gd2FzIGludGVuZGVkIGZvciBvdXIgYXBwXG4gICAgaWYgKEdPT0dMRV9DT05GSUcuY2xpZW50SWQgJiYgcGF5bG9hZC5hdWQgIT09IEdPT0dMRV9DT05GSUcuY2xpZW50SWQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tHb29nbGVdIFRva2VuIGF1ZGllbmNlIG1pc21hdGNoJyk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBWZXJpZnkgZW1haWwgaXMgdmVyaWZpZWRcbiAgICBpZiAoIXBheWxvYWQuZW1haWxfdmVyaWZpZWQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tHb29nbGVdIEVtYWlsIG5vdCB2ZXJpZmllZCcpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1YjogcGF5bG9hZC5zdWIsXG4gICAgICBlbWFpbDogcGF5bG9hZC5lbWFpbCxcbiAgICAgIGVtYWlsX3ZlcmlmaWVkOiBwYXlsb2FkLmVtYWlsX3ZlcmlmaWVkLFxuICAgICAgbmFtZTogcGF5bG9hZC5uYW1lLFxuICAgICAgcGljdHVyZTogcGF5bG9hZC5waWN0dXJlLFxuICAgICAgZ2l2ZW5fbmFtZTogcGF5bG9hZC5naXZlbl9uYW1lLFxuICAgICAgZmFtaWx5X25hbWU6IHBheWxvYWQuZmFtaWx5X25hbWUsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tHb29nbGVdIEVycm9yIHZlcmlmeWluZyB0b2tlbjonLCBlcnJvci5tZXNzYWdlKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEF1dGhlbnRpY2F0ZSB1c2VyIHdpdGggR29vZ2xlIC0gY3JlYXRlcyBvciB1cGRhdGVzIHVzZXIgcmVjb3JkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhdXRoZW50aWNhdGVXaXRoR29vZ2xlKGlkVG9rZW46IHN0cmluZyk6IFByb21pc2U8R29vZ2xlQXV0aFJlc3VsdD4ge1xuICAvLyBWZXJpZnkgdGhlIHRva2VuXG4gIGNvbnN0IGdvb2dsZVVzZXIgPSBhd2FpdCB2ZXJpZnlHb29nbGVUb2tlbihpZFRva2VuKTtcblxuICBpZiAoIWdvb2dsZVVzZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBtZXNzYWdlOiAnSW52YWxpZCBvciBleHBpcmVkIEdvb2dsZSB0b2tlbicsXG4gICAgfTtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIHVzZXIgZXhpc3RzIGJ5IEdvb2dsZSBJRCBvciBlbWFpbFxuICBsZXQgdXNlciA9IGF3YWl0IHByaXNtYS51c2VyLmZpbmRGaXJzdCh7XG4gICAgd2hlcmU6IHtcbiAgICAgIE9SOiBbXG4gICAgICAgIHsgZ29vZ2xlSWQ6IGdvb2dsZVVzZXIuc3ViIH0sXG4gICAgICAgIHsgZW1haWw6IGdvb2dsZVVzZXIuZW1haWwgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG5cbiAgY29uc3QgaXNOZXdVc2VyID0gIXVzZXI7XG5cbiAgaWYgKCF1c2VyKSB7XG4gICAgLy8gQ3JlYXRlIG5ldyB1c2VyXG4gICAgdXNlciA9IGF3YWl0IHByaXNtYS51c2VyLmNyZWF0ZSh7XG4gICAgICBkYXRhOiB7XG4gICAgICAgIGVtYWlsOiBnb29nbGVVc2VyLmVtYWlsLFxuICAgICAgICBuYW1lOiBnb29nbGVVc2VyLm5hbWUsXG4gICAgICAgIHBpY3R1cmU6IGdvb2dsZVVzZXIucGljdHVyZSxcbiAgICAgICAgZ29vZ2xlSWQ6IGdvb2dsZVVzZXIuc3ViLFxuICAgICAgICBwcm9maWxlQ29tcGxldGU6IHRydWUsIC8vIEdvb2dsZSBwcm92aWRlcyBuYW1lLCBzbyBwcm9maWxlIGlzIGNvbXBsZXRlXG4gICAgICB9LFxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIC8vIFVwZGF0ZSBleGlzdGluZyB1c2VyIHdpdGggbGF0ZXN0IEdvb2dsZSBpbmZvXG4gICAgdXNlciA9IGF3YWl0IHByaXNtYS51c2VyLnVwZGF0ZSh7XG4gICAgICB3aGVyZTogeyBpZDogdXNlci5pZCB9LFxuICAgICAgZGF0YToge1xuICAgICAgICBnb29nbGVJZDogZ29vZ2xlVXNlci5zdWIsXG4gICAgICAgIG5hbWU6IHVzZXIubmFtZSB8fCBnb29nbGVVc2VyLm5hbWUsXG4gICAgICAgIHBpY3R1cmU6IGdvb2dsZVVzZXIucGljdHVyZSxcbiAgICAgICAgbGFzdExvZ2luQXQ6IG5ldyBEYXRlKCksXG4gICAgICAgIHByb2ZpbGVDb21wbGV0ZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgbWVzc2FnZTogaXNOZXdVc2VyID8gJ0FjY291bnQgY3JlYXRlZCBzdWNjZXNzZnVsbHknIDogJ0xvZ2luIHN1Y2Nlc3NmdWwnLFxuICAgIHVzZXJJZDogdXNlci5pZCxcbiAgICBpc05ld1VzZXIsXG4gICAgdXNlcjoge1xuICAgICAgaWQ6IHVzZXIuaWQsXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCxcbiAgICAgIG5hbWU6IHVzZXIubmFtZSxcbiAgICAgIHBpY3R1cmU6IHVzZXIucGljdHVyZSxcbiAgICAgIHByb2ZpbGVDb21wbGV0ZTogdXNlci5wcm9maWxlQ29tcGxldGUsXG4gICAgfSxcbiAgfTtcbn1cbiJdfQ==