/**
 * Comprehensive unit tests for Idempotency Key Support
 * Tests key generation, caching, locking, and middleware behavior
 */

import {
  IDEMPOTENCY_CONFIG,
  IDEMPOTENCY_KEYS,
  checkIdempotencyKey,
  startIdempotentRequest,
  storeIdempotencyResponse,
  releaseIdempotencyLock,
  deleteIdempotencyKey,
  IdempotencyResponse,
} from './idempotency';
import { redis, connectRedis, disconnectRedis } from './redis';

// Ensure Redis is connected for tests
beforeAll(async () => {
  await connectRedis();
});

afterAll(async () => {
  await disconnectRedis();
});

// Clean up test keys after each test
afterEach(async () => {
  const testKeys = await redis.keys('idem:test-*');
  if (testKeys.length > 0) {
    await redis.del(...testKeys);
  }
  const lockKeys = await redis.keys('idem:lock:test-*');
  if (lockKeys.length > 0) {
    await redis.del(...lockKeys);
  }
});

describe('Idempotency Key Support', () => {
  describe('Key Generation', () => {
    it('should generate correct key pattern', () => {
      const key = IDEMPOTENCY_KEYS.key('confirm', 'abc123');
      expect(key).toBe('idem:confirm:abc123');
    });

    it('should generate correct lock key pattern', () => {
      const key = IDEMPOTENCY_KEYS.lock('confirm', 'abc123');
      expect(key).toBe('idem:lock:confirm:abc123');
    });

    it('should handle special characters in endpoint', () => {
      const key = IDEMPOTENCY_KEYS.key('api/v1/confirm', 'key123');
      expect(key).toBe('idem:api/v1/confirm:key123');
    });

    it('should handle special characters in idempotency key', () => {
      const key = IDEMPOTENCY_KEYS.key('confirm', 'user@email.com-12345');
      expect(key).toBe('idem:confirm:user@email.com-12345');
    });
  });

  describe('Configuration', () => {
    it('should have 24-hour TTL for keys', () => {
      expect(IDEMPOTENCY_CONFIG.keyTTL).toBe(24 * 60 * 60);
    });

    it('should have correct key prefix', () => {
      expect(IDEMPOTENCY_CONFIG.keyPrefix).toBe('idem');
    });
  });

  describe('checkIdempotencyKey', () => {
    it('should return found=true when key exists with valid JSON', async () => {
      const endpoint = 'test-check-valid';
      const key = 'valid-json-key';
      
      const response: IdempotencyResponse = {
        statusCode: 200,
        body: { success: true },
        createdAt: new Date().toISOString(),
      };
      await redis.set(IDEMPOTENCY_KEYS.key(endpoint, key), JSON.stringify(response));

      const result = await checkIdempotencyKey(endpoint, key);

      expect(result.found).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response?.statusCode).toBe(200);
      expect(result.response?.body).toEqual({ success: true });
    });

    it('should delete key and return found=false for invalid JSON', async () => {
      const endpoint = 'test-check-invalid';
      const key = 'invalid-json-key';
      
      await redis.set(IDEMPOTENCY_KEYS.key(endpoint, key), 'not valid json');

      const result = await checkIdempotencyKey(endpoint, key);

      expect(result.found).toBe(false);
      
      // Verify key was deleted
      const exists = await redis.exists(IDEMPOTENCY_KEYS.key(endpoint, key));
      expect(exists).toBe(0);
    });

    it('should return found=false when key does not exist and no lock', async () => {
      const result = await checkIdempotencyKey('test-nonexistent', 'no-key');

      expect(result.found).toBe(false);
      expect(result.isProcessing).toBe(false);
    });

    it('should return isProcessing=true when lock exists', async () => {
      const endpoint = 'test-check-lock';
      const key = 'locked-key';
      
      await redis.set(IDEMPOTENCY_KEYS.lock(endpoint, key), '1', 'EX', 30);

      const result = await checkIdempotencyKey(endpoint, key);

      expect(result.found).toBe(false);
      expect(result.isProcessing).toBe(true);
    });

    it('should include headers in response when present', async () => {
      const endpoint = 'test-headers';
      const key = 'with-headers';
      
      const response: IdempotencyResponse = {
        statusCode: 201,
        body: { id: 'new-resource' },
        headers: { 'X-Custom-Header': 'value' },
        createdAt: new Date().toISOString(),
      };
      await redis.set(IDEMPOTENCY_KEYS.key(endpoint, key), JSON.stringify(response));

      const result = await checkIdempotencyKey(endpoint, key);

      expect(result.response?.headers).toEqual({ 'X-Custom-Header': 'value' });
    });
  });

  describe('startIdempotentRequest', () => {
    it('should return true when lock acquired (key does not exist)', async () => {
      const endpoint = 'test-start';
      const key = `new-lock-${Date.now()}`;

      const result = await startIdempotentRequest(endpoint, key);

      expect(result).toBe(true);
      
      // Verify lock was created
      const exists = await redis.exists(IDEMPOTENCY_KEYS.lock(endpoint, key));
      expect(exists).toBe(1);
    });

    it('should return false when lock already exists', async () => {
      const endpoint = 'test-start-exists';
      const key = `existing-lock-${Date.now()}`;
      
      // Create existing lock
      await redis.set(IDEMPOTENCY_KEYS.lock(endpoint, key), '1', 'EX', 30);

      const result = await startIdempotentRequest(endpoint, key);

      expect(result).toBe(false);
    });

    it('should set lock with specified TTL', async () => {
      const endpoint = 'test-ttl';
      const key = `ttl-lock-${Date.now()}`;
      const lockTTL = 10;

      await startIdempotentRequest(endpoint, key, lockTTL);

      const ttl = await redis.ttl(IDEMPOTENCY_KEYS.lock(endpoint, key));
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(lockTTL);
    });

    it('should use default 30-second TTL when not specified', async () => {
      const endpoint = 'test-default-ttl';
      const key = `default-ttl-${Date.now()}`;

      await startIdempotentRequest(endpoint, key);

      const ttl = await redis.ttl(IDEMPOTENCY_KEYS.lock(endpoint, key));
      expect(ttl).toBeGreaterThan(25);
      expect(ttl).toBeLessThanOrEqual(30);
    });
  });

  describe('storeIdempotencyResponse', () => {
    it('should store response with correct structure', async () => {
      const endpoint = 'test-store';
      const key = `store-${Date.now()}`;
      
      // First acquire lock
      await startIdempotentRequest(endpoint, key);

      await storeIdempotencyResponse(endpoint, key, 200, { data: 'test' }, { 'X-Header': 'value' });

      const stored = await redis.get(IDEMPOTENCY_KEYS.key(endpoint, key));
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.statusCode).toBe(200);
      expect(parsed.body).toEqual({ data: 'test' });
      expect(parsed.headers).toEqual({ 'X-Header': 'value' });
      expect(parsed.createdAt).toBeDefined();
    });

    it('should delete lock when storing response', async () => {
      const endpoint = 'test-store-delete-lock';
      const key = `delete-lock-${Date.now()}`;
      
      await startIdempotentRequest(endpoint, key);
      
      // Verify lock exists
      let lockExists = await redis.exists(IDEMPOTENCY_KEYS.lock(endpoint, key));
      expect(lockExists).toBe(1);

      await storeIdempotencyResponse(endpoint, key, 200, { success: true });

      // Verify lock was deleted
      lockExists = await redis.exists(IDEMPOTENCY_KEYS.lock(endpoint, key));
      expect(lockExists).toBe(0);
    });

    it('should set TTL on stored response (24 hours)', async () => {
      const endpoint = 'test-store-ttl';
      const key = `store-ttl-${Date.now()}`;

      await storeIdempotencyResponse(endpoint, key, 200, { success: true });

      const ttl = await redis.ttl(IDEMPOTENCY_KEYS.key(endpoint, key));
      expect(ttl).toBeGreaterThan(IDEMPOTENCY_CONFIG.keyTTL - 10);
      expect(ttl).toBeLessThanOrEqual(IDEMPOTENCY_CONFIG.keyTTL);
    });

    it('should store response without headers when not provided', async () => {
      const endpoint = 'test-no-headers';
      const key = `no-headers-${Date.now()}`;

      await storeIdempotencyResponse(endpoint, key, 201, { id: '123' });

      const stored = await redis.get(IDEMPOTENCY_KEYS.key(endpoint, key));
      const parsed = JSON.parse(stored!);
      expect(parsed.headers).toBeUndefined();
    });
  });

  describe('releaseIdempotencyLock', () => {
    it('should delete lock when it exists', async () => {
      const endpoint = 'test-release';
      const key = `release-${Date.now()}`;
      
      await startIdempotentRequest(endpoint, key);
      
      let exists = await redis.exists(IDEMPOTENCY_KEYS.lock(endpoint, key));
      expect(exists).toBe(1);

      await releaseIdempotencyLock(endpoint, key);

      exists = await redis.exists(IDEMPOTENCY_KEYS.lock(endpoint, key));
      expect(exists).toBe(0);
    });

    it('should not throw when lock does not exist (idempotent)', async () => {
      const endpoint = 'test-release-nonexistent';
      const key = `nonexistent-${Date.now()}`;

      // Should not throw
      await expect(releaseIdempotencyLock(endpoint, key)).resolves.not.toThrow();
    });
  });

  describe('deleteIdempotencyKey', () => {
    it('should delete both key and lock', async () => {
      const endpoint = 'test-delete-both';
      const key = `delete-both-${Date.now()}`;
      
      // Create both key and lock
      await redis.set(IDEMPOTENCY_KEYS.key(endpoint, key), JSON.stringify({ test: true }));
      await redis.set(IDEMPOTENCY_KEYS.lock(endpoint, key), '1');

      await deleteIdempotencyKey(endpoint, key);

      const keyExists = await redis.exists(IDEMPOTENCY_KEYS.key(endpoint, key));
      const lockExists = await redis.exists(IDEMPOTENCY_KEYS.lock(endpoint, key));
      
      expect(keyExists).toBe(0);
      expect(lockExists).toBe(0);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should only allow one request to process at a time', async () => {
      const endpoint = 'test-concurrent';
      const key = `concurrent-${Date.now()}`;

      // Simulate two concurrent requests
      const result1 = await startIdempotentRequest(endpoint, key);
      const result2 = await startIdempotentRequest(endpoint, key);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should allow second request after first completes', async () => {
      const endpoint = 'test-sequential';
      const key = `sequential-${Date.now()}`;

      // First request
      const result1 = await startIdempotentRequest(endpoint, key);
      expect(result1).toBe(true);

      // Store response (releases lock)
      await storeIdempotencyResponse(endpoint, key, 200, { first: true });

      // Second request should find cached response, not acquire lock
      const check = await checkIdempotencyKey(endpoint, key);
      expect(check.found).toBe(true);
    });
  });

  describe('Response Types', () => {
    it('should handle null body', async () => {
      const endpoint = 'test-null-body';
      const key = `null-body-${Date.now()}`;

      await storeIdempotencyResponse(endpoint, key, 204, null);

      const result = await checkIdempotencyKey(endpoint, key);
      expect(result.found).toBe(true);
      expect(result.response?.body).toBeNull();
    });

    it('should handle array body', async () => {
      const endpoint = 'test-array-body';
      const key = `array-body-${Date.now()}`;

      await storeIdempotencyResponse(endpoint, key, 200, [1, 2, 3]);

      const result = await checkIdempotencyKey(endpoint, key);
      expect(result.response?.body).toEqual([1, 2, 3]);
    });

    it('should handle deeply nested body', async () => {
      const endpoint = 'test-nested';
      const key = `nested-${Date.now()}`;
      const nestedBody = {
        level1: {
          level2: {
            level3: {
              data: 'deep',
            },
          },
        },
      };

      await storeIdempotencyResponse(endpoint, key, 200, nestedBody);

      const result = await checkIdempotencyKey(endpoint, key);
      expect(result.response?.body).toEqual(nestedBody);
    });

    it('should handle error status codes', async () => {
      const endpoint = 'test-error';
      const key = `error-${Date.now()}`;

      await storeIdempotencyResponse(endpoint, key, 500, { error: 'Internal error' });

      const result = await checkIdempotencyKey(endpoint, key);
      expect(result.response?.statusCode).toBe(500);
      expect(result.response?.body).toEqual({ error: 'Internal error' });
    });
  });
});
