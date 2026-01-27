/**
 * Generate Ed25519 Key Pair for Beckn Protocol
 *
 * This script generates cryptographic keys for Beckn message signing.
 * Run this script and save the output securely.
 *
 * Usage:
 *   npx ts-node packages/bap/src/scripts/generate-beckn-keys.ts
 */

import { generateKeyPair } from '@p2p/shared';

console.log('='.repeat(80));
console.log('🔑 Beckn Protocol Key Generation');
console.log('='.repeat(80));
console.log();

// Generate BAP keys
console.log('📌 Generating BAP (Buyer Application Platform) Keys...');
console.log();

const subscriberId = 'bap.p2p-trading.beckn';
const uniqueKeyId = 'prod-key-1';

const bapKeys = generateKeyPair(subscriberId, uniqueKeyId);

console.log('✅ BAP Keys Generated Successfully!');
console.log();
console.log('-'.repeat(80));
console.log('BAP Key Details:');
console.log('-'.repeat(80));
console.log();
console.log('Subscriber ID:');
console.log(`  ${subscriberId}`);
console.log();
console.log('Key ID (format: subscriber_id|unique_key_id|algorithm):');
console.log(`  ${bapKeys.keyId}`);
console.log();
console.log('Public Key (Base64 - share this with DeDi):');
console.log(`  ${bapKeys.publicKey}`);
console.log();
console.log('Private Key (Base64 - KEEP THIS SECRET!):');
console.log(`  ${bapKeys.privateKey}`);
console.log();

// Generate BPP keys (using same subscriber_id since BAP+BPP are on same host)
console.log('='.repeat(80));
console.log();
console.log('📌 Generating BPP (Buyer-Provider Platform) Keys...');
console.log();

const bppSubscriberId = 'bpp.p2p-trading.beckn';
const bppKeys = generateKeyPair(bppSubscriberId, uniqueKeyId);

console.log('✅ BPP Keys Generated Successfully!');
console.log();
console.log('-'.repeat(80));
console.log('BPP Key Details:');
console.log('-'.repeat(80));
console.log();
console.log('Subscriber ID:');
console.log(`  ${bppSubscriberId}`);
console.log();
console.log('Key ID:');
console.log(`  ${bppKeys.keyId}`);
console.log();
console.log('Public Key (Base64 - share this with DeDi):');
console.log(`  ${bppKeys.publicKey}`);
console.log();
console.log('Private Key (Base64 - KEEP THIS SECRET!):');
console.log(`  ${bppKeys.privateKey}`);
console.log();

// Generate environment variable configuration
console.log('='.repeat(80));
console.log('📝 Railway Environment Variables Configuration');
console.log('='.repeat(80));
console.log();
console.log('Copy these to Railway (or .env file):');
console.log();
console.log('# ===== BECKN SIGNING - BAP =====');
console.log('BECKN_SIGNING_ENABLED=true');
console.log('BECKN_VERIFY_SIGNATURES=true');
console.log(`BECKN_SUBSCRIBER_ID=${subscriberId}`);
console.log(`BECKN_KEY_ID=${bapKeys.keyId}`);
console.log(`BECKN_PRIVATE_KEY=${bapKeys.privateKey}`);
console.log(`BECKN_PUBLIC_KEY=${bapKeys.publicKey}`);
console.log('BECKN_SIGNATURE_TTL=30');
console.log();
console.log('# Note: For BPP, you may need separate env vars if running separately');
console.log(`# BPP_BECKN_KEY_ID=${bppKeys.keyId}`);
console.log(`# BPP_BECKN_PRIVATE_KEY=${bppKeys.privateKey}`);
console.log(`# BPP_BECKN_PUBLIC_KEY=${bppKeys.publicKey}`);
console.log();

// DeDi Registration Instructions
console.log('='.repeat(80));
console.log('📋 DeDi Registry Registration Instructions');
console.log('='.repeat(80));
console.log();
console.log('Follow these steps to register with DeDi:');
console.log();
console.log('1. Access DeDi Registry Portal (get URL from bootcamp materials)');
console.log();
console.log('2. Register BAP:');
console.log('   - Subscriber ID: bap.p2p-trading.beckn');
console.log('   - Type: BAP');
console.log('   - Domain: beckn.one:deg:p2p-trading');
console.log('   - URL: https://p2p-trading-production-c4e8.up.railway.app');
console.log(`   - Signing Public Key: ${bapKeys.publicKey}`);
console.log('   - Countries: IN');
console.log();
console.log('3. Register BPP:');
console.log('   - Subscriber ID: bpp.p2p-trading.beckn');
console.log('   - Type: BPP');
console.log('   - Domain: beckn.one:deg:p2p-trading');
console.log('   - URL: https://p2p-trading-production-c4e8.up.railway.app');
console.log(`   - Signing Public Key: ${bppKeys.publicKey}`);
console.log('   - Countries: IN');
console.log();
console.log('4. Save the Record IDs returned by DeDi');
console.log('   - Use these as the second part of BECKN_KEY_ID if different from "prod-key-1"');
console.log();

// Security Warnings
console.log('='.repeat(80));
console.log('⚠️  SECURITY WARNINGS');
console.log('='.repeat(80));
console.log();
console.log('❌ NEVER commit private keys to git');
console.log('❌ NEVER share private keys in public channels');
console.log('✅ Store private keys securely in Railway environment variables');
console.log('✅ Rotate keys periodically (update DeDi registry when you do)');
console.log('✅ Keep a secure backup of private keys');
console.log();
console.log('='.repeat(80));
console.log('✅ Key Generation Complete!');
console.log('='.repeat(80));
console.log();
