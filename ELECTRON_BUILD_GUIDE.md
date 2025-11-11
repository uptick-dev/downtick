# Electron Build Guide - Making a Distributable Mac App

## Overview

This guide shows you how to create a distributable Mac app that anyone can download and run without any setup.

---

## Option 1: Full Electron App (RECOMMENDED)

Creates a native Mac app with Electron - users just double-click to run, no Terminal needed.

### Prerequisites

```bash
npm install
```

### Build Steps

#### 1. Build for your Mac architecture only (faster)

```bash
npm run build:electron
```

This creates:
- `dist/Uptick Reporter-1.0.0.dmg` - Installer (recommended for distribution)
- `dist/Uptick Reporter-1.0.0-mac.zip` - Zipped app

#### 2. Build Universal Binary (Intel + Apple Silicon)

```bash
npm run build:electron-universal
```

This creates an app that works on both Intel and Apple Silicon Macs (larger file size).

### What Gets Created

- **DMG file**: Users drag the app to Applications folder
- **ZIP file**: Users extract and double-click to run

### Distribution

1. **Upload the DMG** to your file sharing service (Google Drive, Dropbox, etc.)
2. **Share the link** with your team
3. **Users download** and install like any Mac app

### User Instructions

```
1. Download "Uptick Reporter.dmg"
2. Open the DMG file
3. Drag "Uptick Reporter" to Applications folder
4. Open from Applications
5. If macOS blocks it (unsigned app):
   - Right-click the app → Open
   - Click "Open" in the security dialog
6. Enter your Uptick API token on first run
```

### Pros
- ✅ True native Mac app
- ✅ No Terminal window
- ✅ Professional appearance
- ✅ Easy to install (DMG)
- ✅ No Node.js required on user's machine (bundled)

### Cons
- ❌ Larger file size (~200MB)
- ❌ Longer build time
- ❌ Requires code signing for no security warnings (optional)

---

## Option 2: Shell Script .app Bundle (Lightweight)

Creates a lightweight .app that runs Node.js scripts - requires Node.js installed.

### Build Steps

```bash
npm run build:mac
```

This creates: `Uptick Reporter.app`

### Distribution

```bash
# Compress the app
zip -r "Uptick Reporter.zip" "Uptick Reporter.app"

# Share the zip file
```

### User Instructions

```
REQUIREMENTS:
- Node.js 14+ installed (from nodejs.org)

INSTALLATION:
1. Extract "Uptick Reporter.zip"
2. Double-click "Uptick Reporter.app"
3. If macOS blocks it: Right-click → Open
4. App opens in Terminal and launches browser
5. Enter your Uptick API token

TO STOP:
- Press Ctrl+C in Terminal window
```

### Pros
- ✅ Very small file size (~1MB)
- ✅ Fast to build
- ✅ Easy to update

### Cons
- ❌ Requires Node.js installed
- ❌ Opens Terminal window
- ❌ Less professional appearance

---

## Comparison Table

| Feature | Electron App | Shell Script |
|---------|-------------|--------------|
| File Size | ~200MB | ~1MB |
| Node.js Required | No (bundled) | Yes (user installs) |
| Terminal Window | No | Yes |
| Build Time | 2-5 minutes | 5 seconds |
| Professional Look | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Easy Distribution | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Code Signing (Optional but Recommended)

To avoid security warnings, sign your app with an Apple Developer certificate.

### Get a Certificate

1. Join Apple Developer Program ($99/year)
2. Create a Developer ID Application certificate
3. Download and install in Keychain

### Sign the Electron App

Add to `package.json` build config:

```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist"
}
```

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
</dict>
</plist>
```

Then build:

```bash
npm run build:electron-universal
```

### Notarize (Extra Step)

For no warnings at all, notarize with Apple:

```bash
# Install notarization tool
npm install -g notarize-cli

# Notarize
notarize-cli --file "dist/Uptick Reporter-1.0.0.dmg" \
  --bundle-id "com.yourcompany.uptick-reporter" \
  --username "your@apple-id.com" \
  --password "app-specific-password"
```

---

## Testing Your Build

### Test Locally

```bash
# After building
open "dist/Uptick Reporter.app"
# or
open "Uptick Reporter.app"
```

### Test on Another Mac

1. Copy the built app to a USB drive
2. Transfer to another Mac
3. Try to open it
4. Verify all features work

---

## Troubleshooting

### "App is damaged and can't be opened"

This happens with unsigned apps. Users should:
```bash
xattr -cr "/path/to/Uptick Reporter.app"
```

Or right-click → Open

### "Port 3737 already in use"

Kill existing process:
```bash
lsof -ti:3737 | xargs kill
```

### Build fails with "Cannot find module"

```bash
rm -rf node_modules
npm install
npm run build:electron
```

### App doesn't start

Check Console.app for errors:
1. Open Console.app
2. Search for "Uptick Reporter"
3. Look for error messages

---

## Updating Your App

### Make Changes

1. Edit your code
2. Test locally: `npm start`
3. Rebuild: `npm run build:electron`

### Distribute Update

1. Increment version in `package.json`
2. Rebuild
3. Share new DMG/ZIP
4. Users replace old app with new one

### Auto-Update (Advanced)

Use `electron-updater` for automatic updates:

```bash
npm install electron-updater
```

Configure in `main.js` - see electron-updater docs.

---

## Best Practices

### Before Distribution

- [ ] Test on a clean Mac
- [ ] Verify API token encryption works
- [ ] Test all report types
- [ ] Check memory usage
- [ ] Verify graceful shutdown
- [ ] Test with multiple users

### Version Control

```bash
git tag v1.0.0
git push --tags
```

### Release Notes

Create `CHANGELOG.md`:

```markdown
# Changelog

## [1.0.0] - 2024-11-11
### Added
- Weekly RPV Variance Report
- Low RPV Alert
- No Activity Alert
- API token encryption
- Report caching
```

---

## File Size Optimization

### Reduce Electron App Size

1. **Remove dev dependencies from production:**
   Already configured in `package.json` files list

2. **Use asar archive:**
   electron-builder does this automatically

3. **Compress better:**
   ```json
   "mac": {
     "target": ["dmg"],
     "compression": "maximum"
   }
   ```

---

## Summary

### For Internal Team Distribution
**Use Option 1 (Electron App)**
- Professional
- No setup required
- Best user experience

### For Technical Users
**Use Option 2 (Shell Script)**
- Lightweight
- Easy to update
- Good for development

### Quick Commands

```bash
# Build Electron app (recommended)
npm run build:electron

# Build lightweight shell app
npm run build:mac

# Test locally
npm start
```

---

## Next Steps

1. Choose your distribution method
2. Build the app
3. Test on another Mac
4. Create user documentation
5. Distribute to your team
6. Gather feedback
7. Iterate and improve

Good luck! 🚀
