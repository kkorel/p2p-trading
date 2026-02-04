/**
 * Generate Ed25519 Key Pair for Beckn Protocol
 * Standalone Node.js script (no TypeScript compilation needed)
 *
 * Usage: node generate-keys.js
 */

const crypto = require('crypto');

// Beckn algorithm designation
const BECKN_ALGORITHM = 'xed25519';

// Generate key pair
function generateKeyPair(subscriberId, uniqueKeyId = 'prod-key-1') {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
    keyId: `${subscriberId}|${uniqueKeyId}|${BECKN_ALGORITHM}`,
  };
}

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

// Generate BPP keys
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
console.log('Copy these to Railway (Settings > Variables):');
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
console.log('# Note: For BPP, you may need separate env vars if running as separate service');
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
console.log('1. Access DeDi Registry Portal');
console.log('   URL: (get from bootcamp materials or ask instructors)');
console.log();
console.log('2. Register BAP:');
console.log('   Field                  | Value');
console.log('   -----------------------|------------------------------------------');
console.log('   Subscriber ID          | bap.p2p-trading.beckn');
console.log('   Type                   | BAP');
console.log('   Domain                 | beckn.one:deg:p2p-trading');
console.log('   URL (Callback)         | https://p2p-trading-production-c4e8.up.railway.app');
console.log(`   Signing Public Key     | ${bapKeys.publicKey}`);
console.log('   Countries              | IN');
console.log();
console.log('3. Register BPP:');
console.log('   Field                  | Value');
console.log('   -----------------------|------------------------------------------');
console.log('   Subscriber ID          | bpp.p2p-trading.beckn');
console.log('   Type                   | BPP');
console.log('   Domain                 | beckn.one:deg:p2p-trading');
console.log('   URL (Callback)         | https://p2p-trading-production-c4e8.up.railway.app');
console.log(`   Signing Public Key     | ${bppKeys.publicKey}`);
console.log('   Countries              | IN');
console.log();
console.log('4. After Registration:');
console.log('   - Save the Record IDs returned by DeDi');
console.log('   - If Record ID differs from "prod-key-1", update BECKN_KEY_ID:');
console.log('     BECKN_KEY_ID=bap.p2p-trading.beckn|<record_id>|xed25519');
console.log();
console.log('5. Wait for DeDi cache refresh (usually a few minutes)');
console.log();

// Security Warnings
console.log('='.repeat(80));
console.log('⚠️  SECURITY WARNINGS');
console.log('='.repeat(80));
console.log();
console.log('❌ NEVER commit private keys to git');
console.log('❌ NEVER share private keys in public channels');
console.log('❌ NEVER expose private keys in API responses or logs');
console.log('✅ Store private keys ONLY in Railway environment variables');
console.log('✅ Rotate keys periodically (update DeDi when you do)');
console.log('✅ Keep a secure offline backup of private keys');
console.log();
console.log('='.repeat(80));
console.log('✅ Key Generation Complete!');
console.log('='.repeat(80));
console.log();
console.log('Next Steps:');
console.log('1. Copy the environment variables above to Railway');
console.log('2. Register with DeDi registry using the public keys');
console.log('3. Redeploy your Railway service');
console.log('4. Test with signed requests');
console.log();
