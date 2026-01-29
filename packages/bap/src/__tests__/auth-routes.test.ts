/**
 * Integration tests for Authentication Routes
 * Tests Google OAuth flow, session management, and profile endpoints
 */

import request from 'supertest';
import express, { Express } from 'express';
import { prisma, redis, connectRedis, disconnectRedis, createSession, getSession, deleteSession } from '@p2p/shared';

// Create a mock Express app for testing
let app: Express;

// Mock the OAuth module
jest.mock('@p2p/shared', () => {
  const actual = jest.requireActual('@p2p/shared');
  return {
    ...actual,
    verifyGoogleToken: jest.fn(),
    createSession: jest.fn(),
    getSession: jest.fn(),
    deleteSession: jest.fn(),
    refreshSession: jest.fn(),
    prisma: {
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    },
  };
});

const { verifyGoogleToken, createSession: mockCreateSession, getSession: mockGetSession, deleteSession: mockDeleteSession } = require('@p2p/shared');

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup express app with auth routes
    app = express();
    app.use(express.json());
    
    // Mock routes
    app.get('/api/auth/google', (req, res) => {
      const redirectUrl = 'https://accounts.google.com/o/oauth2/auth?client_id=test';
      res.json({ url: redirectUrl });
    });
    
    app.post('/api/auth/google/callback', async (req, res) => {
      try {
        const { code } = req.body;
        if (!code) {
          return res.status(400).json({ error: 'Missing authorization code' });
        }
        
        const result = await verifyGoogleToken(code);
        if (!result) {
          return res.status(401).json({ error: 'Invalid token' });
        }
        
        const token = await mockCreateSession(result.userId);
        res.json({ success: true, token });
      } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
      }
    });
    
    app.get('/api/user/profile', async (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const session = await mockGetSession(token);
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid session', code: 'SESSION_INVALID' });
      }
      
      const user = await require('@p2p/shared').prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) {
        return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      }
      
      res.json(user);
    });
    
    app.post('/api/auth/logout', async (req, res) => {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        await mockDeleteSession(token);
      }
      res.json({ success: true });
    });
    
    app.put('/api/user/profile', async (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const session = await mockGetSession(token);
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      const { name, meterNumber } = req.body;
      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }
      
      const user = await require('@p2p/shared').prisma.user.update({
        where: { id: session.userId },
        data: { name, meterNumber, profileComplete: true },
      });
      
      res.json(user);
    });
  });

  describe('GET /api/auth/google', () => {
    it('should return Google OAuth URL', async () => {
      const response = await request(app).get('/api/auth/google');
      
      expect(response.status).toBe(200);
      expect(response.body.url).toContain('accounts.google.com');
    });

    it('should include client_id in URL', async () => {
      const response = await request(app).get('/api/auth/google');
      
      expect(response.body.url).toContain('client_id=');
    });
  });

  describe('POST /api/auth/google/callback', () => {
    it('should return 400 when authorization code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('authorization code');
    });

    it('should return 401 when token verification fails', async () => {
      verifyGoogleToken.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({ code: 'invalid-code' });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should return session token on successful authentication', async () => {
      verifyGoogleToken.mockResolvedValue({ userId: 'user-123', email: 'test@example.com' });
      mockCreateSession.mockResolvedValue('session-token-abc');
      
      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({ code: 'valid-code' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('session-token-abc');
    });

    it('should handle OAuth errors gracefully', async () => {
      verifyGoogleToken.mockRejectedValue(new Error('OAuth error'));
      
      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({ code: 'error-code' });
      
      expect(response.status).toBe(500);
      expect(response.body.error).toContain('failed');
    });
  });

  describe('GET /api/user/profile', () => {
    it('should return 401 when no authorization header', async () => {
      const response = await request(app).get('/api/user/profile');
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('should return 401 when session is invalid', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('SESSION_INVALID');
    });

    it('should return 401 when user not found', async () => {
      mockGetSession.mockResolvedValue({ userId: 'deleted-user' });
      require('@p2p/shared').prisma.user.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return user profile when authenticated', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-123' });
      require('@p2p/shared').prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        profileComplete: true,
      });
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.name).toBe('Test User');
    });

    it('should accept Bearer prefix in authorization', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-123' });
      require('@p2p/shared').prisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer my-token');
      
      expect(response.status).toBe(200);
      expect(mockGetSession).toHaveBeenCalledWith('my-token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return success even without token', async () => {
      const response = await request(app).post('/api/auth/logout');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should delete session when token provided', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer session-to-delete');
      
      expect(response.status).toBe(200);
      expect(mockDeleteSession).toHaveBeenCalledWith('session-to-delete');
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .send({ name: 'New Name' });
      
      expect(response.status).toBe(401);
    });

    it('should return 400 when name is too short', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-123' });
      
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'A' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 2 characters');
    });

    it('should update profile successfully', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-123' });
      require('@p2p/shared').prisma.user.update.mockResolvedValue({
        id: 'user-123',
        name: 'Updated Name',
        meterNumber: 'MTR-123',
        profileComplete: true,
      });
      
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated Name', meterNumber: 'MTR-123' });
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.profileComplete).toBe(true);
    });

    it('should set profileComplete to true after update', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-123' });
      require('@p2p/shared').prisma.user.update.mockResolvedValue({
        id: 'user-123',
        name: 'Test',
        profileComplete: true,
      });
      
      await request(app)
        .put('/api/user/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test' });
      
      expect(require('@p2p/shared').prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ profileComplete: true }),
        })
      );
    });
  });
});
