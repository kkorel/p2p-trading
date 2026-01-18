/**
 * Shared Configuration
 */

export const config = {
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
