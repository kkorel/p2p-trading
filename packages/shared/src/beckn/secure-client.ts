/**
 * Secure Beckn HTTP Client
 * 
 * Wraps axios with automatic message signing for Beckn protocol compliance.
 * All outgoing Beckn messages are signed using Ed25519.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BecknKeyPair, createSignedHeaders, generateKeyPair } from './signing';
import { createLogger } from '../utils/logger';

const logger = createLogger('BECKN-CLIENT');

// Configuration for signing
interface SecureClientConfig {
  keyPair: BecknKeyPair;
  enabled: boolean;  // Allow disabling for testing
  ttlSeconds?: number;
}

// Singleton key pair - in production, load from secure storage
let clientKeyPair: BecknKeyPair | null = null;
let signingEnabled = false;
let signatureTtl = 30; // seconds

/**
 * Initialize the secure client with a key pair
 * Call this at service startup
 */
export function initializeSecureClient(config: Partial<SecureClientConfig> = {}): BecknKeyPair {
  if (config.keyPair) {
    clientKeyPair = config.keyPair;
  } else if (!clientKeyPair) {
    // Generate a new key pair if none exists
    // In production, this should be loaded from secure storage/env
    const subscriberId = process.env.BECKN_SUBSCRIBER_ID || 'p2p-energy-bap';
    clientKeyPair = generateKeyPair(subscriberId);
    logger.info('Generated new Beckn signing key pair', {
      keyId: clientKeyPair.keyId,
      publicKey: clientKeyPair.publicKey.substring(0, 20) + '...'
    });
  }

  signingEnabled = config.enabled ?? (process.env.BECKN_SIGNING_ENABLED === 'true');
  signatureTtl = config.ttlSeconds ?? parseInt(process.env.BECKN_SIGNATURE_TTL || '30', 10);

  logger.info('Secure Beckn client initialized', {
    signingEnabled,
    signatureTtl,
    keyId: clientKeyPair.keyId
  });

  return clientKeyPair;
}

/**
 * Get the current public key for registration with Beckn registry
 */
export function getPublicKey(): string | null {
  return clientKeyPair?.publicKey || null;
}

/**
 * Get the current key ID
 */
export function getKeyId(): string | null {
  return clientKeyPair?.keyId || null;
}

/**
 * Get the current key pair for signing
 * Returns null if not initialized
 */
export function getKeyPair(): BecknKeyPair | null {
  return clientKeyPair;
}

/**
 * Check if signing is enabled
 */
export function isSigningEnabled(): boolean {
  return signingEnabled && clientKeyPair !== null;
}

/**
 * Make a signed POST request to a Beckn endpoint
 */
export async function signedPost<T = any>(
  url: string,
  body: object,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // Build headers
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config?.headers as Record<string, string> || {}),
  };

  // Add signature headers if signing is enabled
  if (signingEnabled && clientKeyPair) {
    try {
      const signedHeaders = createSignedHeaders(body, clientKeyPair, signatureTtl);
      headers = { ...headers, ...signedHeaders };
      logger.debug('Added signature headers to request', {
        url,
        keyId: clientKeyPair.keyId
      });
    } catch (error: any) {
      logger.error('Failed to sign request, sending unsigned', {
        url,
        error: error.message
      });
    }
  }

  return axios.post<T>(url, body, { ...config, headers });
}

/**
 * Create a pre-configured axios instance with signing middleware
 */
export function createSecureAxiosInstance(): AxiosInstance {
  const instance = axios.create();

  // Add request interceptor for signing
  instance.interceptors.request.use(
    (config) => {
      if (
        signingEnabled &&
        clientKeyPair &&
        config.method?.toLowerCase() === 'post' &&
        config.data
      ) {
        try {
          const signedHeaders = createSignedHeaders(config.data, clientKeyPair, signatureTtl);
          // Merge signed headers into existing headers
          Object.entries(signedHeaders).forEach(([key, value]) => {
            config.headers.set(key, value);
          });
          logger.debug('Request signed', { url: config.url, keyId: clientKeyPair.keyId });
        } catch (error: any) {
          logger.error('Failed to sign request', { url: config.url, error: error.message });
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for logging
  instance.interceptors.response.use(
    (response) => {
      logger.debug('Response received', {
        url: response.config.url,
        status: response.status
      });
      return response;
    },
    (error) => {
      logger.error('Request failed', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message
      });
      return Promise.reject(error);
    }
  );

  return instance;
}

// Export a default secure instance
export const secureAxios = createSecureAxiosInstance();
