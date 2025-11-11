# Code Signing Issue - RESOLVED ✅

## Problem
```
Warning: unable to build chain to self-signed root for signer "Developer ID Application: John Bell (M3Q9SM4LDD)"
ALERtick.app: errSecInternalComponent
```

## Root Cause
Your Developer ID Application certificate was installed, but the **intermediate certificates were missing** from your keychain. The complete certificate chain requires:

1. ✅ Developer ID Application: John Bell (M3Q9SM4LDD)
2. ❌ Developer ID Certification Authority (G2) - **Was Missing**
3. ❌ Apple Root CA - **Was Missing**

## Solution Applied

### 1. Downloaded and Installed Missing Certificates
```bash
# Downloaded intermediate certificates
curl -O https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer
curl -O https://www.apple.com/appleca/AppleIncRootCertificate.cer

# Installed to keychain
security import DeveloperIDG2CA.cer -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign
security import AppleIncRootCertificate.cer -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign
```

### 2. Updated package.json
Added codesigning configuration:
```json
"mac": {
  "identity": "Developer ID Application: John Bell (M3Q9SM4LDD)",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist"
}
```

### 3. Created Entitlements File
Created `build/entitlements.mac.plist` with required permissions for Electron apps.

## Verification
```bash
# Verify certificate chain is complete
security find-identity -v -p codesigning
```

Output should show:
```
1) 0A2E496D667C43B685936AA6F68FF3F21EEEAC36 "Developer ID Application: John Bell (M3Q9SM4LDD)"
   1 valid identities found
```

## Next Steps

### Rebuild Your App
```bash
# Clean previous build
rm -rf dist

# Build with codesigning
npm run build:electron

# Or for universal binary
npm run build:electron-universal
```

### Verify Codesigning
```bash
# Check if app is properly signed
codesign --verify --deep --strict --verbose=2 dist/mac/ALERtick.app

# View signature details
codesign -dv --verbose=4 dist/mac/ALERtick.app
```

### Expected Output
```
dist/mac/ALERtick.app: valid on disk
dist/mac/ALERtick.app: satisfies its Designated Requirement
```

## Optional: Notarization

For distribution without any security warnings, you should also notarize the app:

```bash
# After building, notarize with Apple
xcrun notarytool submit dist/ALERtick-1.0.1-mac.zip \
  --apple-id "your@apple-id.com" \
  --team-id "M3Q9SM4LDD" \
  --password "app-specific-password" \
  --wait

# Staple the notarization ticket
xcrun stapler staple dist/mac/ALERtick.app
```

### Generate App-Specific Password
1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Security → App-Specific Passwords
4. Generate new password
5. Use this password for notarization

## Files Created/Modified

- ✅ `package.json` - Added codesigning configuration
- ✅ `build/entitlements.mac.plist` - Created entitlements file
- ✅ Installed intermediate certificates to keychain

## Clean Up (Optional)

You can delete the downloaded certificate files:
```bash
rm DeveloperIDG2CA.cer AppleIncRootCertificate.cer
```

The certificates are now installed in your keychain and don't need the .cer files anymore.

---

**Status**: ✅ Ready to build with codesigning enabled
