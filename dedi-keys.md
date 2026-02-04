================================================================================
🔑 Beckn Protocol Key Generation
================================================================================

📌 Generating BAP (Buyer Application Platform) Keys...

✅ BAP Keys Generated Successfully!

--------------------------------------------------------------------------------
BAP Key Details:
--------------------------------------------------------------------------------

Subscriber ID:
  bap.p2p-trading.beckn

Key ID (format: subscriber_id|unique_key_id|algorithm):
  bap.p2p-trading.beckn|prod-key-1|xed25519

Public Key (Base64 - share this with DeDi):
  MCowBQYDK2VwAyEAn8mtaBF9jcOXpPoEMVnL1VWT34Ec5azbhf0mLRTXDQQ=

Private Key (Base64 - KEEP THIS SECRET!):
  MC4CAQAwBQYDK2VwBCIEICPMvEAXF7MiqrwmS37+snOoqXkFVgoEPGNBbmVx67f/

================================================================================

📌 Generating BPP (Buyer-Provider Platform) Keys...

✅ BPP Keys Generated Successfully!

--------------------------------------------------------------------------------
BPP Key Details:
--------------------------------------------------------------------------------

Subscriber ID:
  bpp.p2p-trading.beckn

Key ID:
  bpp.p2p-trading.beckn|prod-key-1|xed25519

Public Key (Base64 - share this with DeDi):
  MCowBQYDK2VwAyEAUyQhlQgZNKNvuRM29qyB8RgHbWMmnLtZ7thpqOQV1b4=

Private Key (Base64 - KEEP THIS SECRET!):
  MC4CAQAwBQYDK2VwBCIEIBYRpUisW4cpsbUgWsLod0tg2Ii7tpYQobAMQMjVTL9+

================================================================================
📝 Railway Environment Variables Configuration
================================================================================

Copy these to Railway (Settings > Variables):

# ===== BECKN SIGNING - BAP =====
BECKN_SIGNING_ENABLED=true
BECKN_VERIFY_SIGNATURES=true
BECKN_SUBSCRIBER_ID=bap.p2p-trading.beckn
BECKN_KEY_ID=bap.p2p-trading.beckn|prod-key-1|xed25519
BECKN_PRIVATE_KEY=MC4CAQAwBQYDK2VwBCIEICPMvEAXF7MiqrwmS37+snOoqXkFVgoEPGNBbmVx67f/
BECKN_PUBLIC_KEY=MCowBQYDK2VwAyEAn8mtaBF9jcOXpPoEMVnL1VWT34Ec5azbhf0mLRTXDQQ=
BECKN_SIGNATURE_TTL=30

# Note: For BPP, you may need separate env vars if running as separate service
# BPP_BECKN_KEY_ID=bpp.p2p-trading.beckn|prod-key-1|xed25519
# BPP_BECKN_PRIVATE_KEY=MC4CAQAwBQYDK2VwBCIEIBYRpUisW4cpsbUgWsLod0tg2Ii7tpYQobAMQMjVTL9+
# BPP_BECKN_PUBLIC_KEY=MCowBQYDK2VwAyEAUyQhlQgZNKNvuRM29qyB8RgHbWMmnLtZ7thpqOQV1b4=

================================================================================
📋 DeDi Registry Registration Instructions
================================================================================

Follow these steps to register with DeDi:

1. Access DeDi Registry Portal
   URL: (get from bootcamp materials or ask instructors)

2. Register BAP:
   Field                  | Value
   -----------------------|------------------------------------------
   Subscriber ID          | bap.p2p-trading.beckn
   Type                   | BAP
   Domain                 | beckn.one:deg:p2p-trading
   URL (Callback)         | https://p2p-trading-production-c4e8.up.railway.app
   Signing Public Key     | MCowBQYDK2VwAyEAn8mtaBF9jcOXpPoEMVnL1VWT34Ec5azbhf0mLRTXDQQ=
   Countries              | IN

3. Register BPP:
   Field                  | Value
   -----------------------|------------------------------------------
   Subscriber ID          | bpp.p2p-trading.beckn
   Type                   | BPP
   Domain                 | beckn.one:deg:p2p-trading
   URL (Callback)         | https://p2p-trading-production-c4e8.up.railway.app
   Signing Public Key     | MCowBQYDK2VwAyEAUyQhlQgZNKNvuRM29qyB8RgHbWMmnLtZ7thpqOQV1b4=
   Countries              | IN

4. After Registration:
   - Save the Record IDs returned by DeDi
   - If Record ID differs from "prod-key-1", update BECKN_KEY_ID:
     BECKN_KEY_ID=bap.p2p-trading.beckn|<record_id>|xed25519

5. Wait for DeDi cache refresh (usually a few minutes)

================================================================================
⚠️  SECURITY WARNINGS
================================================================================

❌ NEVER commit private keys to git
❌ NEVER share private keys in public channels
❌ NEVER expose private keys in API responses or logs
✅ Store private keys ONLY in Railway environment variables
✅ Rotate keys periodically (update DeDi when you do)
✅ Keep a secure offline backup of private keys

================================================================================
✅ Key Generation Complete!
================================================================================

Next Steps:
1. Copy the environment variables above to Railway
2. Register with DeDi registry using the public keys
3. Redeploy your Railway service
4. Test with signed requests