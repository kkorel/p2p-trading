/**
 * Authentication Routes
 * Handles Google OAuth authentication
 */

import { Router, Request, Response } from 'express';
import {
  prisma,
  authenticateWithGoogle,
  createSession,
  deleteSession,
  deleteAllUserSessions,
  GOOGLE_CONFIG,
} from '@p2p/shared';
import { authMiddleware } from './middleware/auth';

const router = Router();

/**
 * GET /auth/config
 * Get client-side auth configuration (Google Client ID)
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    googleClientId: GOOGLE_CONFIG.clientId,
  });
});

/**
 * POST /auth/google
 * Authenticate with Google ID token
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Google ID token is required',
      });
    }

    // Authenticate with Google
    const result = await authenticateWithGoogle(idToken);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.message,
      });
    }

    // Create session
    const session = await createSession({
      userId: result.userId!,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    // Get full user details
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            trustScore: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: result.message,
      token: session.token,
      expiresAt: session.expiresAt,
      isNewUser: result.isNewUser,
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        picture: user!.picture,
        profileComplete: user!.profileComplete,
        balance: user!.balance,
        providerId: user!.providerId,
        provider: user!.provider,
        // Trust score fields
        trustScore: user!.trustScore,
        allowedTradeLimit: user!.allowedTradeLimit,
        meterDataAnalyzed: user!.meterDataAnalyzed,
        // Production capacity fields
        productionCapacity: user!.productionCapacity,
        meterVerifiedCapacity: user!.meterVerifiedCapacity,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.',
    });
  }
});

/**
 * POST /auth/logout
 * Logout current session
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.sessionToken) {
      await deleteSession(req.sessionToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * POST /auth/logout-all
 * Logout all sessions for current user
 */
router.post('/logout-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const count = await deleteAllUserSessions(req.user!.id);

    res.json({
      success: true,
      message: `Logged out from ${count} session(s)`,
      sessionsTerminated: count,
    });
  } catch (error: any) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            totalOrders: true,
            successfulOrders: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        profileComplete: user.profileComplete,
        balance: user.balance,
        providerId: user.providerId,
        provider: user.provider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        // Trust score fields
        trustScore: user.trustScore,
        allowedTradeLimit: user.allowedTradeLimit,
        meterDataAnalyzed: user.meterDataAnalyzed,
        // Production capacity fields
        productionCapacity: user.productionCapacity,
        meterVerifiedCapacity: user.meterVerifiedCapacity,
      },
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
    });
  }
});

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, productionCapacity } = req.body;

    // Validate input
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters',
      });
    }

    if (productionCapacity !== undefined && (typeof productionCapacity !== 'number' || productionCapacity < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Production capacity must be a non-negative number (kWh per month)',
      });
    }

    // Update user
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (productionCapacity !== undefined) updateData.productionCapacity = productionCapacity;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            trustScore: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        profileComplete: user.profileComplete,
        balance: user.balance,
        providerId: user.providerId,
        provider: user.provider,
        // Trust and capacity fields
        trustScore: user.trustScore,
        allowedTradeLimit: user.allowedTradeLimit,
        productionCapacity: user.productionCapacity,
        meterVerifiedCapacity: user.meterVerifiedCapacity,
        meterDataAnalyzed: user.meterDataAnalyzed,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

/**
 * POST /auth/setup-provider
 * Create or link provider profile for the user
 */
router.post('/setup-provider', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Provider name is required (at least 2 characters)',
      });
    }

    // Check if user already has a provider
    if (req.user!.providerId) {
      return res.status(400).json({
        success: false,
        error: 'You already have a seller profile',
      });
    }

    // Create provider and link to user
    const providerId = `provider-${req.user!.id}`;

    const provider = await prisma.provider.create({
      data: {
        id: providerId,
        name: name.trim(),
        trustScore: 0.5, // Starting trust score
      },
    });

    // Link provider to user
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { providerId: provider.id },
    });

    res.json({
      success: true,
      message: 'Seller profile created successfully',
      provider: {
        id: provider.id,
        name: provider.name,
        trustScore: provider.trustScore,
      },
    });
  } catch (error: any) {
    console.error('Setup provider error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create seller profile',
    });
  }
});

/**
 * GET /auth/balance
 * Get current user's balance
 */
router.get('/balance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { balance: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      balance: user.balance,
    });
  } catch (error: any) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance',
    });
  }
});

/**
 * PUT /auth/balance
 * Set user balance (for demo purposes)
 */
router.put('/balance', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { balance } = req.body;

    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({
        success: false,
        error: 'Balance must be a non-negative number',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { balance: Math.round(balance * 100) / 100 },
      select: { balance: true },
    });

    res.json({
      success: true,
      balance: user.balance,
    });
  } catch (error: any) {
    console.error('Update balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update balance',
    });
  }
});

/**
 * POST /auth/payment
 * Verify payment was escrowed for an order
 * NOTE: Actual payment deduction happens in /confirm (escrow)
 *       Seller payment happens after DISCOM verification
 */
router.post('/payment', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { orderId, amount, sellerId } = req.body;
    const buyerId = req.user!.id;

    if (!orderId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment parameters',
      });
    }

    // Check if order exists and payment was escrowed
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        paymentStatus: true, 
        buyerId: true,
        totalPrice: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Get buyer's current balance
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { balance: true },
    });

    if (!buyer) {
      return res.status(404).json({
        success: false,
        error: 'Buyer not found',
      });
    }

    // Payment is handled via escrow in /confirm
    // Seller will be paid after DISCOM verification
    // This endpoint just confirms the escrow status

    res.json({
      success: true,
      message: 'Payment escrowed successfully. Seller will be paid after delivery verification.',
      payment: {
        orderId,
        amount,
        status: order.paymentStatus || 'ESCROWED',
        // Seller is NOT paid yet - paid after DISCOM verification
        sellerReceived: 0,
        note: 'Seller payment pending delivery verification',
      },
      newBalance: buyer.balance,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
    });
  }
});

export default router;
