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
  createLogger,
} from '@p2p/shared';
import { authMiddleware, devModeOnly } from './middleware';

const logger = createLogger('Auth');

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
    logger.error(`Google auth error: ${error}`);
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
    logger.error(`Logout error: ${error}`);
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
    logger.error(`Logout all error: ${error}`);
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
    logger.error(`Get me error: ${error}`);
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
    logger.error(`Update profile error: ${error}`);
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
    logger.error(`Setup provider error: ${error}`);
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
    logger.error(`Get balance error: ${error}`);
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
    logger.error(`Update balance error: ${error}`);
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
 * FIXED: Now waits for paymentStatus=ESCROWED before returning balance
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

    // Wait for order payment status to be ESCROWED (up to 5 seconds)
    // This handles the race condition where confirm uses setTimeout
    const maxWaitMs = 5000;
    const pollIntervalMs = 200;
    const startTime = Date.now();
    
    let order = null;
    while (Date.now() - startTime < maxWaitMs) {
      order = await prisma.order.findUnique({
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

      // If payment is already escrowed, break out of loop
      if (order.paymentStatus === 'ESCROWED') {
        break;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Get buyer's CURRENT balance (after potential escrow deduction)
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
    // This endpoint confirms the escrow status and returns CURRENT balance

    res.json({
      success: true,
      message: 'Payment escrowed successfully. Seller will be paid after delivery verification.',
      payment: {
        orderId,
        amount,
        status: order?.paymentStatus || 'PENDING',
        // Seller is NOT paid yet - paid after DISCOM verification
        sellerReceived: 0,
        note: 'Seller payment pending delivery verification',
      },
      newBalance: buyer.balance,
    });
  } catch (error: any) {
    logger.error(`Payment verification error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
    });
  }
});


/**
 * POST /auth/analyze-meter
 * Analyze meter PDF to extract production capacity and auto-set it
 * Successful analysis gives +10% trust score bonus
 */
router.post('/analyze-meter', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'PDF file is required (base64 encoded)',
      });
    }

    // Check if user already has verified meter data (can only verify once)
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { meterDataAnalyzed: true, trustScore: true, productionCapacity: true },
    });

    if (currentUser?.meterDataAnalyzed) {
      return res.status(400).json({
        success: false,
        error: 'Meter data has already been analyzed. You can only verify once.',
      });
    }

    // Import the analyzer
    const { analyzeMeterPdf, saveMeterPdf } = await import('./meter-analyzer');

    // Decode the base64 PDF
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Save the PDF for record-keeping
    const pdfPath = await saveMeterPdf(req.user!.id, pdfBuffer);

    // Use existing capacity as reference, or 0 if not set (will extract from PDF)
    const declaredCapacity = currentUser?.productionCapacity || 0;

    // Analyze the PDF using OpenRouter
    const analysisResult = await analyzeMeterPdf(pdfBuffer, declaredCapacity);

    // Update user based on analysis result
    const updateData: any = {
      meterDataAnalyzed: true,
      meterPdfUrl: pdfPath, // Store the PDF path
    };

    let trustBonus = 0;
    let message = '';
    let extractedCapacity: number | null = null;

    if (analysisResult.success && analysisResult.extractedCapacity) {
      extractedCapacity = analysisResult.extractedCapacity;

      // Store the extracted capacity as verified
      updateData.meterVerifiedCapacity = extractedCapacity;

      // AUTO-SET production capacity from the meter reading!
      updateData.productionCapacity = extractedCapacity;

      if (declaredCapacity > 0 && analysisResult.matchesDeclaration) {
        // Had existing capacity and it matches - give full 10% trust bonus
        trustBonus = 0.10;
        message = `Great! Your meter reading (${extractedCapacity} kWh) matches your declaration. Production capacity confirmed. +10% trust bonus!`;
      } else if (declaredCapacity > 0 && analysisResult.quality === 'MEDIUM') {
        // Had existing capacity, partial match - give 7% bonus
        trustBonus = 0.07;
        message = `Meter shows ${extractedCapacity} kWh/month. Production capacity updated. +7% trust bonus!`;
      } else {
        // No prior declaration OR new extraction - give full 10% for verified meter data
        trustBonus = 0.10;
        message = `Production capacity auto-set to ${extractedCapacity} kWh/month from your meter reading. +10% trust bonus!`;
      }
    } else {
      // Analysis failed - NO trust bonus if we couldn't extract capacity
      trustBonus = 0;
      updateData.meterDataAnalyzed = false; // Don't mark as analyzed if failed

      // Log the actual error for debugging
      logger.debug(`[MeterAnalyzer] API analysis failed: ${analysisResult.error}`);

      message = `Could not extract production capacity from the document. Please try with a clearer meter reading PDF.`;
    }

    // Only apply trust bonus if extraction succeeded (cap at 100%)
    if (trustBonus > 0) {
      const newTrustScore = Math.min(1.0, (currentUser?.trustScore || 0.3) + trustBonus);
      updateData.trustScore = newTrustScore;

      // Recalculate allowed trade limit based on new trust score
      const { calculateAllowedLimit } = await import('@p2p/shared');
      updateData.allowedTradeLimit = calculateAllowedLimit(newTrustScore);
    }

    // Update user record
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      include: {
        provider: {
          select: { id: true, name: true, trustScore: true },
        },
      },
    });

    // Record trust score change in history if bonus was applied
    if (trustBonus > 0 && extractedCapacity) {
      await prisma.trustScoreHistory.create({
        data: {
          userId: req.user!.id,
          previousScore: currentUser?.trustScore || 0.3,
          newScore: updatedUser.trustScore,
          previousLimit: updatedUser.allowedTradeLimit - (trustBonus * 100), // Approximate
          newLimit: updatedUser.allowedTradeLimit,
          reason: 'METER_VERIFIED',
          metadata: JSON.stringify({
            extractedCapacity: analysisResult.extractedCapacity,
            declaredCapacity,
            quality: analysisResult.quality,
            matchesDeclaration: analysisResult.matchesDeclaration,
            trustBonus: `+${(trustBonus * 100).toFixed(0)}%`,
          }),
        },
      });
    }

    // If extraction failed, return error response
    if (!extractedCapacity) {
      return res.status(400).json({
        success: false,
        error: message,
        analysis: {
          extractedCapacity: null,
          quality: analysisResult.quality,
          insights: analysisResult.insights || 'Could not extract capacity from document',
        },
      });
    }

    res.json({
      success: true,
      message,
      analysis: {
        extractedCapacity: analysisResult.extractedCapacity,
        declaredCapacity,
        quality: analysisResult.quality,
        matchesDeclaration: analysisResult.matchesDeclaration,
        insights: analysisResult.insights,
      },
      trustBonus: trustBonus > 0 ? `+${(trustBonus * 100).toFixed(0)}%` : null,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        picture: updatedUser.picture,
        profileComplete: updatedUser.profileComplete,
        balance: updatedUser.balance,
        providerId: updatedUser.providerId,
        provider: updatedUser.provider,
        trustScore: updatedUser.trustScore,
        allowedTradeLimit: updatedUser.allowedTradeLimit,
        productionCapacity: updatedUser.productionCapacity,
        meterVerifiedCapacity: updatedUser.meterVerifiedCapacity,
        meterDataAnalyzed: updatedUser.meterDataAnalyzed,
      },
    });
  } catch (error: any) {
    logger.error(`Meter analysis error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze meter PDF. Please try again.',
    });
  }
});

/**
 * POST /auth/reset-meter - Reset meter analysis (for testing)
 * Allows user to re-upload and re-analyze their meter data
 * Protected: DEV_MODE only
 */
router.post('/reset-meter', devModeOnly, authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        meterDataAnalyzed: false,
        meterVerifiedCapacity: null,
        meterPdfUrl: null,
      },
    });

    res.json({
      success: true,
      message: 'Meter data reset. You can now upload a new meter reading.',
    });
  } catch (error: any) {
    logger.error(`Reset meter error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to reset meter data.',
    });
  }
});

// =============================================================================
// Verifiable Credentials API
// =============================================================================

/**
 * POST /auth/vc/verify
 * Verify a Verifiable Credential (VC)
 * Accepts both JSON object or VC ID string
 */
router.post('/vc/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { credential, vcId, options } = req.body;

    if (!credential && !vcId) {
      return res.status(400).json({
        success: false,
        error: 'Either credential (JSON) or vcId (string) is required',
      });
    }

    // Import VC verification utilities
    const { verifyCredential, VCPortalClient } = await import('@p2p/shared');

    let vcToVerify = credential;
    let fetchedFromPortal = false;

    // If vcId provided, try to fetch from portal
    if (vcId && !credential) {
      try {
        const portalClient = new VCPortalClient();
        vcToVerify = await portalClient.fetchCredential(vcId);
        fetchedFromPortal = true;

        if (!vcToVerify) {
          return res.status(404).json({
            success: false,
            error: `Credential not found: ${vcId}`,
          });
        }
      } catch (fetchError: any) {
        return res.status(400).json({
          success: false,
          error: `Failed to fetch credential: ${fetchError.message}`,
        });
      }
    }

    // Validate credential structure
    if (!vcToVerify || typeof vcToVerify !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid credential format',
      });
    }

    // Perform verification
    const verificationResult = await verifyCredential(vcToVerify, options || {});

    // Store or update the credential record for this user
    // (In a full implementation, you'd have a UserCredential table)

    res.json({
      success: true,
      verified: verificationResult.verified,
      credentialId: vcToVerify.id || vcId,
      credentialType: vcToVerify.type,
      issuer: typeof vcToVerify.issuer === 'string' ? vcToVerify.issuer : vcToVerify.issuer?.id,
      subject: vcToVerify.credentialSubject?.id,
      fetchedFromPortal,
      checks: verificationResult.checks,
      error: verificationResult.error,
    });
  } catch (error: any) {
    logger.error(`VC verification error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Credential verification failed',
    });
  }
});

/**
 * GET /auth/me/credentials
 * List the user's verified credentials
 * Note: This is a simplified version - in production you'd have a UserCredential table
 */
router.get('/me/credentials', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        meterDataAnalyzed: true,
        meterVerifiedCapacity: true,
        meterPdfUrl: true,
        providerId: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Build list of credentials based on user's verification status
    const credentials: Array<{
      type: string;
      status: 'verified' | 'pending' | 'not_submitted';
      description: string;
      verifiedAt?: string;
      details?: Record<string, any>;
    }> = [];

    // Utility Customer Credential (required for energy trading)
    credentials.push({
      type: 'UtilityCustomerCredential',
      status: user.meterDataAnalyzed ? 'verified' : 'not_submitted',
      description: 'Proof of connection to the electricity grid',
      details: user.meterDataAnalyzed ? {
        verifiedCapacity: user.meterVerifiedCapacity,
        pdfUploaded: !!user.meterPdfUrl,
      } : undefined,
    });

    // DER Certificate (for sellers with solar panels)
    if (user.providerId) {
      credentials.push({
        type: 'DERCertificateCredential',
        status: 'pending', // Would check against stored VC
        description: 'Certificate proving ownership of Distributed Energy Resource (e.g., solar panel)',
      });
    }

    res.json({
      success: true,
      credentials,
      totalVerified: credentials.filter(c => c.status === 'verified').length,
      totalPending: credentials.filter(c => c.status === 'pending').length,
    });
  } catch (error: any) {
    logger.error(`Get credentials error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credentials',
    });
  }
});

export default router;
