/**
 * Shared Configuration
 */

export const config = {
  // Database configuration
  database: {
    url: process.env.DATABASE_URL ||
        'postgresql://p2p_user:p2p_password@localhost:5432/p2p_trading',
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Service ports
  ports: {
    bap: parseInt(process.env.BAP_PORT || '4000'),
    cds: parseInt(process.env.CDS_PORT || '4001'),
    bpp: parseInt(process.env.BPP_PORT || '4002'),
  },

  // Service URLs (BAP and BPP now on same host)
  urls: {
    bap: process.env.BAP_URL || 'http://localhost:4000',
    cds: process.env.CDS_URL || 'http://localhost:4001',
    bpp: process.env.BPP_URL || 'http://localhost:4000',
  },

  // External Beckn services (production endpoints)
  external: {
    // Catalog Discovery Service (Beckn network CDS)
    // Note: Our code appends /discover, so base URL is /beckn
    cds: process.env.EXTERNAL_CDS_URL || 'https://34.93.141.21.sslip.io/beckn',
    // DEG Ledger for immutable trade records
    ledger: process.env.LEDGER_URL || 'https://34.93.166.38.sslip.io',
    // Verifiable Credentials portal
    vcPortal: process.env.VC_PORTAL_URL || 'https://open-vcs.up.railway.app',
    // Use external CDS instead of local mock
    useExternalCds: process.env.USE_EXTERNAL_CDS === 'true',
    // Enable ledger writes (disable for local dev)
    enableLedgerWrites: process.env.ENABLE_LEDGER_WRITES === 'true',
  },

  // Verifiable Credentials configuration
  vc: {
    // Trusted issuer DIDs for VC verification
    trustedIssuers: (process.env.VC_TRUSTED_ISSUERS || '').split(',').filter(Boolean),
    // Whether to require cryptographic proof verification
    requireProofVerification: process.env.VC_REQUIRE_PROOF === 'true',
    // VC Portal API key (if required)
    portalApiKey: process.env.VC_PORTAL_API_KEY || '',
  },

  // BAP identity
  bap: {
    id: process.env.BAP_ID || 'bap.p2p-trading.local',
    uri: process.env.BAP_URI || 'http://localhost:4000',
  },

  // BPP identity (now on same host as BAP)
  bpp: {
    id: process.env.BPP_ID || 'bpp.p2p-trading.local',
    uri: process.env.BPP_URI || 'http://localhost:4000',
  },

  // CDS identity
  cds: {
    id: process.env.CDS_ID || 'cds.p2p-trading.local',
    uri: process.env.CDS_URI || 'http://localhost:4001',
  },

  // Callback delay (ms) - simulates async processing
  callbackDelay: parseInt(process.env.CALLBACK_DELAY || '100'),

  // Matching algorithm configuration
  matching: {
    weights: {
      price: parseFloat(process.env.MATCH_WEIGHT_PRICE || '0.40'),
      trust: parseFloat(process.env.MATCH_WEIGHT_TRUST || '0.35'),
      timeWindowFit: parseFloat(process.env.MATCH_WEIGHT_TIME || '0.25'),
    },
    minTrustThreshold: parseFloat(process.env.MIN_TRUST_THRESHOLD || '0.2'),
    defaultTrustScore: parseFloat(process.env.DEFAULT_TRUST_SCORE || '0.5'),
  },
};
