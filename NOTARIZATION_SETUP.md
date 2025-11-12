# Notarization Setup Guide

Complete guide to set up code signing and notarization for your Electron app releases.

## Why Notarize?

**Without notarization:**
- Users see "App is damaged and can't be opened"
- Must right-click → Open to bypass Gatekeeper
- Looks unprofessional

**With notarization:**
- ✅ App opens normally with double-click
- ✅ No security warnings
- ✅ Professional distribution
- ✅ Required for auto-updates to work smoothly

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at: https://developer.apple.com

2. **Valid Developer Certificate**
   - "Developer ID Application" certificate

3. **App-Specific Password**
   - For notarization service

## Step 1: Get Your Team ID

### Find Your Team ID

1. Go to: https://developer.apple.com/account
2. Click on "Membership" in the sidebar
3. Your **Team ID** is shown (10 characters, e.g., `A1B2C3D4E5`)

### Update package.json

Replace `YOUR_TEAM_ID` in `package.json`:

```json
"notarize": {
  "teamId": "A1B2C3D4E5"
}
```

## Step 2: Install Developer Certificate

### Check Existing Certificates

```bash
security find-identity -v -p codesigning
```

Look for: `Developer ID Application: Your Name (TEAM_ID)`

### If You Don't Have It

1. Go to: https://developer.apple.com/account/resources/certificates/list
2. Click **"+"** to create a new certificate
3. Select **"Developer ID Application"**
4. Follow the prompts to create a Certificate Signing Request (CSR)
5. Download and double-click the certificate to install it in Keychain

### Verify Installation

```bash
security find-identity -v -p codesigning
```

You should see:
```
1) A1B2C3D4E5F6... "Developer ID Application: Your Name (TEAM_ID)"
```

## Step 3: Create App-Specific Password

### Generate Password

1. Go to: https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. In **Security** section, find **App-Specific Passwords**
4. Click **"Generate an app-specific password"**
5. Label it: `ALERtick Notarization`
6. Click **Create**
7. **Copy the password** (format: `xxxx-xxxx-xxxx-xxxx`)

### Set Environment Variables

You need **three** environment variables:

```bash
# Your GitHub token (already set)
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Your Apple ID email
export APPLE_ID="your.email@example.com"

# The app-specific password
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

### Make Them Permanent

Add all three to your `~/.zshrc`:

```bash
cat >> ~/.zshrc << 'EOF'
# GitHub token for releases
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Apple credentials for notarization
export APPLE_ID="your.email@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
EOF

source ~/.zshrc
```

### Verify All Variables

```bash
echo $GH_TOKEN
echo $APPLE_ID
echo $APPLE_APP_SPECIFIC_PASSWORD
```

All three should display their values.

## Step 4: Verify Entitlements File

Check that `build/entitlements.mac.plist` exists:

```bash
cat build/entitlements.mac.plist
```

It should contain:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
</dict>
</plist>
```

## Step 5: Test Build with Notarization

### First Test (Without Publishing)

```bash
npm run build:electron
```

This will:
1. ✅ Build the app
2. ✅ Code sign with your certificate
3. ✅ Upload to Apple for notarization
4. ✅ Wait for Apple's approval (2-5 minutes)
5. ✅ Staple the notarization ticket

Watch for:
- `signing file=dist/mac/ALERtick.app`
- `notarizing file=dist/ALERtick-X.X.X-mac.zip`
- `notarization successful`

### If Successful

You'll see:
```
• notarizing       file=dist/ALERtick-0.0.4-mac.zip
• notarization successful
```

### If It Fails

Common issues:

**"No identity found"**
- Certificate not installed
- Run: `security find-identity -v -p codesigning`

**"APPLE_ID not set"**
- Environment variable missing
- Run: `export APPLE_ID="your.email@example.com"`

**"Invalid credentials"**
- Wrong app-specific password
- Generate a new one

**"Invalid Team ID"**
- Wrong team ID in package.json
- Check: https://developer.apple.com/account

## Step 6: Publish Notarized Release

Once the test build succeeds:

```bash
npm run publish
```

This will:
1. Build for Intel + ARM
2. Code sign both versions
3. Notarize both versions
4. Upload to GitHub
5. Create release with notarized files

## Verification

### Check Notarization Status

```bash
# Download your release
unzip ALERtick-0.0.4-mac.zip

# Check if notarized
spctl -a -vv ALERtick.app
```

Should show:
```
ALERtick.app: accepted
source=Notarized Developer ID
```

### Test on Another Mac

1. Download the release zip
2. Extract it
3. Double-click the app
4. Should open without any warnings!

## Troubleshooting

### Notarization Takes Too Long

Normal wait time: 2-5 minutes
If it takes longer than 10 minutes, check:

```bash
# Check notarization history
xcrun notarytool history --apple-id "your.email@example.com" --team-id "YOUR_TEAM_ID"
```

### Check Notarization Log

If notarization fails:

```bash
# Get the submission ID from the error message
xcrun notarytool log <submission-id> --apple-id "your.email@example.com" --team-id "YOUR_TEAM_ID"
```

### Certificate Expired

Certificates expire after 5 years. To renew:
1. Go to: https://developer.apple.com/account/resources/certificates/list
2. Revoke old certificate
3. Create new "Developer ID Application" certificate
4. Install it

### Wrong Certificate Used

If multiple certificates exist:

```bash
# List all certificates
security find-identity -v -p codesigning

# Specify which one to use in package.json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  ...
}
```

## Environment Variables Summary

For full functionality, you need:

```bash
# Required for GitHub releases
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Required for notarization
export APPLE_ID="your.email@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

## Cost Breakdown

- **Apple Developer Account**: $99/year (required)
- **GitHub**: Free for public repos, or GitHub Pro for private repos
- **Everything else**: Free

## Workflow After Setup

Once everything is configured:

1. Update version in `package.json`
2. Commit changes
3. Run: `npm run publish`
4. Wait 5-10 minutes for build + notarization
5. Release appears on GitHub with notarized files
6. Users get update notification
7. Update installs cleanly with no warnings

## Security Best Practices

1. **Never commit credentials**
   - Don't add tokens/passwords to git
   - Use environment variables only

2. **Rotate tokens regularly**
   - GitHub tokens: Every 6-12 months
   - App-specific passwords: If compromised

3. **Limit token permissions**
   - GitHub: Only `repo` scope
   - Apple: App-specific passwords only

4. **Backup certificates**
   - Export from Keychain
   - Store securely (password-protected)

## Additional Resources

- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-builder Notarization](https://www.electron.build/configuration/mac#notarization)
- [Troubleshooting Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution/resolving_common_notarization_issues)

## Quick Reference

```bash
# Check certificates
security find-identity -v -p codesigning

# Verify environment variables
echo $GH_TOKEN
echo $APPLE_ID
echo $APPLE_APP_SPECIFIC_PASSWORD

# Build without publishing
npm run build:electron

# Build and publish with notarization
npm run publish

# Check if app is notarized
spctl -a -vv ALERtick.app

# View notarization history
xcrun notarytool history --apple-id "$APPLE_ID" --team-id "YOUR_TEAM_ID"
```

## Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify all environment variables are set
3. Ensure certificate is installed
4. Check Apple Developer account is active
5. Review the notarization log

Common fixes solve 90% of issues:
- Re-export environment variables
- Reinstall certificate
- Generate new app-specific password
