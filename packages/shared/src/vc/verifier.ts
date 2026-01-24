/**
 * Verifiable Credentials Verifier
 * Handles parsing, validation, and verification of VCs
 */

import {
  VerifiableCredential,
  VerifiablePresentation,
  VerificationResult,
  VerificationCheck,
  VerificationOptions,
  VCProof,
  GenerationProfileSubject,
  GridConnectionSubject,
} from './types';

// =============================================================================
// Constants
// =============================================================================

const VC_CONTEXT_V1 = 'https://www.w3.org/2018/credentials/v1';
const VC_CONTEXT_V2 = 'https://www.w3.org/ns/credentials/v2';
const VALID_VC_CONTEXTS = [VC_CONTEXT_V1, VC_CONTEXT_V2];

const REQUIRED_VC_TYPE = 'VerifiableCredential';

// Default trusted issuers (should be configured per environment)
const DEFAULT_TRUSTED_ISSUERS: string[] = [];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract issuer ID from issuer field (can be string or object)
 */
export function getIssuerId(issuer: VerifiableCredential['issuer']): string {
  if (typeof issuer === 'string') {
    return issuer;
  }
  return issuer.id;
}

/**
 * Get issuance date from VC (handles both 1.1 and 2.0 formats)
 */
export function getIssuanceDate(vc: VerifiableCredential): string | undefined {
  return vc.validFrom || vc.issuanceDate;
}

/**
 * Get expiration date from VC (handles both 1.1 and 2.0 formats)
 */
export function getExpirationDate(vc: VerifiableCredential): string | undefined {
  return vc.validUntil || vc.expirationDate;
}

/**
 * Check if a date string is in the past
 */
function isDateInPast(dateStr: string, referenceDate: Date = new Date()): boolean {
  const date = new Date(dateStr);
  return date.getTime() < referenceDate.getTime();
}

/**
 * Check if a date string is in the future
 */
function isDateInFuture(dateStr: string, referenceDate: Date = new Date()): boolean {
  const date = new Date(dateStr);
  return date.getTime() > referenceDate.getTime();
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate VC structure (without cryptographic verification)
 */
export function validateVCStructure(vc: unknown): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  // Check if VC is an object
  if (!vc || typeof vc !== 'object') {
    checks.push({
      check: 'structure',
      status: 'failed',
      message: 'Credential must be an object',
    });
    return checks;
  }

  const credential = vc as Record<string, unknown>;

  // Check @context
  if (!credential['@context']) {
    checks.push({
      check: 'context',
      status: 'failed',
      message: 'Missing @context field',
    });
  } else if (!Array.isArray(credential['@context'])) {
    checks.push({
      check: 'context',
      status: 'failed',
      message: '@context must be an array',
    });
  } else {
    const contexts = credential['@context'] as string[];
    const hasValidContext = contexts.some((ctx) =>
      typeof ctx === 'string' && VALID_VC_CONTEXTS.includes(ctx)
    );
    if (hasValidContext) {
      checks.push({
        check: 'context',
        status: 'passed',
        message: 'Valid @context found',
      });
    } else {
      checks.push({
        check: 'context',
        status: 'warning',
        message: 'Non-standard @context - may not be fully compatible',
        details: { contexts },
      });
    }
  }

  // Check type
  if (!credential.type) {
    checks.push({
      check: 'type',
      status: 'failed',
      message: 'Missing type field',
    });
  } else if (!Array.isArray(credential.type)) {
    checks.push({
      check: 'type',
      status: 'failed',
      message: 'type must be an array',
    });
  } else {
    const types = credential.type as string[];
    if (types.includes(REQUIRED_VC_TYPE)) {
      checks.push({
        check: 'type',
        status: 'passed',
        message: 'Contains VerifiableCredential type',
        details: { types },
      });
    } else {
      checks.push({
        check: 'type',
        status: 'failed',
        message: 'Must include "VerifiableCredential" type',
        details: { types },
      });
    }
  }

  // Check issuer
  if (!credential.issuer) {
    checks.push({
      check: 'issuer',
      status: 'failed',
      message: 'Missing issuer field',
    });
  } else {
    const issuer = credential.issuer;
    if (typeof issuer === 'string' || (typeof issuer === 'object' && (issuer as any).id)) {
      checks.push({
        check: 'issuer',
        status: 'passed',
        message: 'Valid issuer field',
        details: { issuer: typeof issuer === 'string' ? issuer : (issuer as any).id },
      });
    } else {
      checks.push({
        check: 'issuer',
        status: 'failed',
        message: 'Issuer must be a string or object with id field',
      });
    }
  }

  // Check credentialSubject
  if (!credential.credentialSubject) {
    checks.push({
      check: 'credentialSubject',
      status: 'failed',
      message: 'Missing credentialSubject field',
    });
  } else if (typeof credential.credentialSubject !== 'object') {
    checks.push({
      check: 'credentialSubject',
      status: 'failed',
      message: 'credentialSubject must be an object',
    });
  } else {
    checks.push({
      check: 'credentialSubject',
      status: 'passed',
      message: 'Valid credentialSubject',
    });
  }

  // Check dates (optional but validate format if present)
  const issuanceDate = (credential.validFrom || credential.issuanceDate) as string | undefined;
  const expirationDate = (credential.validUntil || credential.expirationDate) as string | undefined;

  if (issuanceDate) {
    const date = new Date(issuanceDate);
    if (isNaN(date.getTime())) {
      checks.push({
        check: 'issuanceDate',
        status: 'failed',
        message: 'Invalid issuance date format',
      });
    } else {
      checks.push({
        check: 'issuanceDate',
        status: 'passed',
        message: 'Valid issuance date',
        details: { issuanceDate },
      });
    }
  }

  if (expirationDate) {
    const date = new Date(expirationDate);
    if (isNaN(date.getTime())) {
      checks.push({
        check: 'expirationDate',
        status: 'failed',
        message: 'Invalid expiration date format',
      });
    } else {
      checks.push({
        check: 'expirationDate',
        status: 'passed',
        message: 'Valid expiration date',
        details: { expirationDate },
      });
    }
  }

  return checks;
}

/**
 * Validate proof structure (without cryptographic verification)
 */
export function validateProofStructure(proof: unknown): VerificationCheck {
  if (!proof) {
    return {
      check: 'proof',
      status: 'warning',
      message: 'No proof attached - credential cannot be cryptographically verified',
    };
  }

  const proofObj = proof as VCProof;

  if (!proofObj.type) {
    return {
      check: 'proof',
      status: 'failed',
      message: 'Proof missing type field',
    };
  }

  if (!proofObj.verificationMethod) {
    return {
      check: 'proof',
      status: 'failed',
      message: 'Proof missing verificationMethod field',
    };
  }

  if (!proofObj.proofValue && !proofObj.jws) {
    return {
      check: 'proof',
      status: 'failed',
      message: 'Proof missing proofValue or jws field',
    };
  }

  return {
    check: 'proof',
    status: 'passed',
    message: 'Proof structure is valid',
    details: {
      type: proofObj.type,
      verificationMethod: proofObj.verificationMethod,
      created: proofObj.created,
    },
  };
}

/**
 * Check if credential is expired
 */
export function checkExpiration(vc: VerifiableCredential, referenceDate: Date = new Date()): VerificationCheck {
  const expirationDate = getExpirationDate(vc);

  if (!expirationDate) {
    return {
      check: 'expiration',
      status: 'passed',
      message: 'Credential has no expiration date',
    };
  }

  if (isDateInPast(expirationDate, referenceDate)) {
    return {
      check: 'expiration',
      status: 'failed',
      message: 'Credential has expired',
      details: { expirationDate, checkedAt: referenceDate.toISOString() },
    };
  }

  return {
    check: 'expiration',
    status: 'passed',
    message: 'Credential is not expired',
    details: { expirationDate },
  };
}

/**
 * Check if issuance date is valid (not in the future)
 */
export function checkIssuanceDate(vc: VerifiableCredential, referenceDate: Date = new Date()): VerificationCheck {
  const issuanceDate = getIssuanceDate(vc);

  if (!issuanceDate) {
    return {
      check: 'issuanceDate',
      status: 'warning',
      message: 'Credential has no issuance date',
    };
  }

  if (isDateInFuture(issuanceDate, referenceDate)) {
    return {
      check: 'issuanceDate',
      status: 'failed',
      message: 'Credential issuance date is in the future',
      details: { issuanceDate, checkedAt: referenceDate.toISOString() },
    };
  }

  return {
    check: 'issuanceDate',
    status: 'passed',
    message: 'Valid issuance date',
    details: { issuanceDate },
  };
}

/**
 * Check if issuer is in trusted list
 */
export function checkTrustedIssuer(
  vc: VerifiableCredential,
  trustedIssuers: string[] = DEFAULT_TRUSTED_ISSUERS
): VerificationCheck {
  if (trustedIssuers.length === 0) {
    return {
      check: 'trustedIssuer',
      status: 'warning',
      message: 'No trusted issuers configured - skipping issuer verification',
    };
  }

  const issuerId = getIssuerId(vc.issuer);

  if (trustedIssuers.includes(issuerId)) {
    return {
      check: 'trustedIssuer',
      status: 'passed',
      message: 'Issuer is in trusted list',
      details: { issuer: issuerId },
    };
  }

  return {
    check: 'trustedIssuer',
    status: 'failed',
    message: 'Issuer is not in trusted list',
    details: { issuer: issuerId, trustedIssuers },
  };
}

/**
 * Check if credential has expected types
 */
export function checkCredentialTypes(
  vc: VerifiableCredential,
  expectedTypes: string[]
): VerificationCheck {
  if (expectedTypes.length === 0) {
    return {
      check: 'expectedTypes',
      status: 'skipped',
      message: 'No expected types specified',
    };
  }

  const vcTypes = vc.type;
  const missingTypes = expectedTypes.filter((t) => !vcTypes.includes(t));

  if (missingTypes.length === 0) {
    return {
      check: 'expectedTypes',
      status: 'passed',
      message: 'Credential has all expected types',
      details: { expectedTypes, actualTypes: vcTypes },
    };
  }

  return {
    check: 'expectedTypes',
    status: 'failed',
    message: 'Credential missing expected types',
    details: { expectedTypes, actualTypes: vcTypes, missingTypes },
  };
}

// =============================================================================
// Cryptographic Verification (Placeholder - requires crypto libraries)
// =============================================================================

/**
 * Verify cryptographic proof
 * 
 * NOTE: This is a placeholder implementation. Full cryptographic verification
 * requires libraries like @digitalbazaar/ed25519-signature-2020, jsonld, etc.
 * For now, this validates proof structure and marks as "not verified".
 * 
 * In production, integrate with:
 * - DID resolver for verificationMethod lookup
 * - Signature verification library for the proof type
 * - JSON-LD canonicalization for data integrity
 */
export async function verifyProof(
  vc: VerifiableCredential,
  _options?: VerificationOptions
): Promise<VerificationCheck> {
  const proof = vc.proof;

  if (!proof) {
    return {
      check: 'proofVerification',
      status: 'failed',
      message: 'No proof to verify',
    };
  }

  // Handle array of proofs (use first one)
  const proofObj = Array.isArray(proof) ? proof[0] : proof;

  // Validate proof structure first
  const structureCheck = validateProofStructure(proofObj);
  if (structureCheck.status === 'failed') {
    return {
      check: 'proofVerification',
      status: 'failed',
      message: `Proof structure invalid: ${structureCheck.message}`,
    };
  }

  // TODO: Implement actual cryptographic verification
  // For now, return a warning that proof was not cryptographically verified
  return {
    check: 'proofVerification',
    status: 'warning',
    message: 'Proof structure valid but cryptographic verification not implemented. ' +
             'Install @digitalbazaar/ed25519-signature-2020 for full verification.',
    details: {
      proofType: proofObj.type,
      verificationMethod: proofObj.verificationMethod,
      note: 'Signature verification pending crypto library integration',
    },
  };
}

// =============================================================================
// Main Verification Function
// =============================================================================

/**
 * Verify a Verifiable Credential
 */
export async function verifyCredential(
  credential: unknown,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];
  const {
    trustedIssuers = [],
    verifyProof: shouldVerifyProof = true,
    expectedTypes = [],
    currentTime = new Date(),
  } = options;

  // 1. Validate structure
  const structureChecks = validateVCStructure(credential);
  checks.push(...structureChecks);

  // If structure is invalid, return early
  const hasStructureFailure = structureChecks.some((c) => c.status === 'failed');
  if (hasStructureFailure) {
    return {
      verified: false,
      checks,
      error: 'Credential structure validation failed',
    };
  }

  const vc = credential as VerifiableCredential;

  // 2. Check issuance date
  checks.push(checkIssuanceDate(vc, currentTime));

  // 3. Check expiration
  checks.push(checkExpiration(vc, currentTime));

  // 4. Check trusted issuer
  if (trustedIssuers.length > 0) {
    checks.push(checkTrustedIssuer(vc, trustedIssuers));
  }

  // 5. Check expected types
  if (expectedTypes.length > 0) {
    checks.push(checkCredentialTypes(vc, expectedTypes));
  }

  // 6. Verify proof (if requested)
  if (shouldVerifyProof) {
    const proofCheck = await verifyProof(vc, options);
    checks.push(proofCheck);
  }

  // Determine overall verification status
  const hasFailed = checks.some((c) => c.status === 'failed');
  const hasWarning = checks.some((c) => c.status === 'warning');

  return {
    verified: !hasFailed,
    credentialId: vc.id,
    issuer: getIssuerId(vc.issuer),
    issuanceDate: getIssuanceDate(vc),
    expirationDate: getExpirationDate(vc),
    checks,
    claims: vc.credentialSubject as Record<string, unknown>,
    error: hasFailed ? 'One or more verification checks failed' : undefined,
  };
}

/**
 * Parse and verify a VC from JSON string
 */
export async function parseAndVerifyCredential(
  json: string,
  options?: VerificationOptions
): Promise<VerificationResult> {
  try {
    const credential = JSON.parse(json);
    return verifyCredential(credential, options);
  } catch (error) {
    return {
      verified: false,
      checks: [{
        check: 'parsing',
        status: 'failed',
        message: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      error: 'Invalid JSON',
    };
  }
}

// =============================================================================
// Energy Credential Specific Helpers
// =============================================================================

/**
 * Verify a Generation Profile VC and extract claims
 */
export async function verifyGenerationProfile(
  credential: unknown,
  options?: VerificationOptions
): Promise<VerificationResult & { generationProfile?: GenerationProfileSubject }> {
  const result = await verifyCredential(credential, {
    ...options,
    expectedTypes: [...(options?.expectedTypes || []), 'GenerationProfileCredential'],
  });

  if (result.verified && result.claims) {
    return {
      ...result,
      generationProfile: result.claims as unknown as GenerationProfileSubject,
    };
  }

  return result;
}

/**
 * Verify a Grid Connection VC and extract claims
 */
export async function verifyGridConnection(
  credential: unknown,
  options?: VerificationOptions
): Promise<VerificationResult & { gridConnection?: GridConnectionSubject }> {
  const result = await verifyCredential(credential, {
    ...options,
    expectedTypes: [...(options?.expectedTypes || []), 'GridConnectionCredential'],
  });

  if (result.verified && result.claims) {
    return {
      ...result,
      gridConnection: result.claims as unknown as GridConnectionSubject,
    };
  }

  return result;
}

/**
 * Extract provider/consumer ID from a Generation Profile VC
 * Handles both IES format (consumerNumber) and standard format (providerId)
 */
export function extractProviderId(vc: VerifiableCredential): string | undefined {
  const subject = vc.credentialSubject as GenerationProfileSubject;
  // Try multiple field names for flexibility
  return subject.providerId || subject.consumerNumber || subject.id;
}

/**
 * Extract capacity from a Generation Profile VC
 * Handles both string and number formats
 */
export function extractCapacity(vc: VerifiableCredential): number | undefined {
  const subject = vc.credentialSubject as GenerationProfileSubject;
  const capacity = subject.capacityKW || subject.installedCapacityKW;
  if (capacity === undefined) return undefined;
  return typeof capacity === 'string' ? parseFloat(capacity) : capacity;
}

/**
 * Extract generation/source type from a Generation Profile VC
 */
export function extractSourceType(vc: VerifiableCredential): string | undefined {
  const subject = vc.credentialSubject as GenerationProfileSubject;
  return subject.generationType || subject.sourceType;
}

/**
 * Extract full name from a Generation Profile VC
 */
export function extractFullName(vc: VerifiableCredential): string | undefined {
  const subject = vc.credentialSubject as GenerationProfileSubject;
  return subject.fullName || subject.providerName;
}

/**
 * Check if generation profile matches expected provider
 */
export function validateProviderMatch(
  vc: VerifiableCredential,
  expectedProviderId: string
): VerificationCheck {
  const providerId = extractProviderId(vc);

  if (!providerId) {
    return {
      check: 'providerMatch',
      status: 'warning',
      message: 'Credential does not contain providerId or consumerNumber - cannot verify provider match',
    };
  }

  if (providerId === expectedProviderId) {
    return {
      check: 'providerMatch',
      status: 'passed',
      message: 'Provider/Consumer ID matches expected value',
      details: { providerId },
    };
  }

  return {
    check: 'providerMatch',
    status: 'failed',
    message: 'Provider/Consumer ID does not match expected value',
    details: { expected: expectedProviderId, actual: providerId },
  };
}

/**
 * Extract normalized claims from a Generation Profile VC
 * Normalizes IES format to a consistent structure
 */
export function extractNormalizedGenerationClaims(vc: VerifiableCredential): {
  id?: string;
  fullName?: string;
  capacityKW?: number;
  sourceType?: string;
  meterNumber?: string;
  consumerNumber?: string;
  commissioningDate?: string;
  issuer?: string;
} {
  const subject = vc.credentialSubject as GenerationProfileSubject;
  return {
    id: subject.id,
    fullName: extractFullName(vc),
    capacityKW: extractCapacity(vc),
    sourceType: extractSourceType(vc),
    meterNumber: subject.meterNumber || subject.meterId,
    consumerNumber: subject.consumerNumber || subject.providerId,
    commissioningDate: subject.commissioningDate,
    issuer: getIssuerId(vc.issuer),
  };
}
