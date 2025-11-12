# Downtick - Complete Guide

A self-contained desktop application for generating weekly variance reports.

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Development](#development)
- [Building & Distribution](#building--distribution)
- [Auto-Updates](#auto-updates)
- [Code Signing & Notarization](#code-signing--notarization)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### For End Users

1. Download `Downtick.app` (or extract from .zip)
2. Double-click to open
3. If macOS blocks it: Right-click → Open
4. Enter your API token
5. View your reports

**System Requirements:**
- macOS 10.13 or higher
- Internet connection

### For Developers

```bash
# Clone and install
cd /path/to/downtick
npm install

# Run in development
npm start

# Build for distribution
npm run build:electron
```

---

## Features

- **Weekly Variance Report**: Identifies publisher sites with >10% week-over-week variance
- **Real-time Data**: Fetches directly from API
- **Secure Token Storage**: Encrypted locally using AES-256
- **Self-Contained**: Everything bundled in a single .app file
- **Auto-Updates**: Automatic update checking via GitHub Releases

### Metrics Tracked

- **Impressions** - Total ad views
- **Clicks** - User clicks on ads
- **Revenue** - Money generated
- **Actions** - Conversions/signups

---

## Development

### Project Structure

```
downtick/
├── main.js                   # Electron main process
├── standalone-server.js      # Express backend + API logic
├── package.json              # Dependencies & build config
├── public/
│   ├── index.html           # Frontend HTML
│   ├── styles.css           # Styling
│   └── app.js               # Frontend JavaScript
└── build/
    └── entitlements.mac.plist
```

### How It Works

1. Electron app starts Express server on localhost:3737
2. JSON file stores encrypted tokens locally
3. Axios fetches data from API
4. Frontend displays reports in web UI

### Development Commands

```bash
# Start app (opens browser automatically)
npm start

# Run with DevTools
npm run dev

# Run just the server
npm run server
```

### Customization

**Change Variance Threshold** (default: 10%)
Edit `standalone-server.js` line ~134:
```javascript
this.threshold = 15.0; // Change to desired percentage
```

**Change Port** (default: 3737)
Edit `standalone-server.js` line ~330:
```javascript
const PORT = 3737;
```

**Styling**
Edit `public/styles.css` to customize colors, fonts, etc.

---

## Building & Distribution

### Build with Electron Builder (Recommended)

```bash
# Build for local distribution
npm run build:electron

# Build and publish to GitHub Releases
npm run publish
```

**Output Files:**
- `dist/Downtick-{version}-mac.zip` - Intel Mac build
- `dist/Downtick-{version}-arm64-mac.zip` - Apple Silicon build
- `dist/latest-mac.yml` - Update metadata

### Distribution Methods

**Method 1: GitHub Releases with Auto-Updates (Recommended)**
- Publish releases to GitHub
- Users get automatic update notifications
- One-click update installation

**Method 2: Direct Distribution**
- Share the `.zip` files directly
- Users extract and double-click
- No auto-update support

**Method 3: Legacy .app Bundle**
```bash
npm run build:mac
```
Creates traditional macOS app bundle (requires Node.js on user's machine)

### User Installation

**From GitHub Release:**
1. Download the appropriate .zip file:
   - Intel Mac: `Downtick-{version}-mac.zip`
   - Apple Silicon: `Downtick-{version}-arm64-mac.zip`
2. Extract the .zip file
3. Move app to Applications folder
4. Open the app
5. If blocked by security: Right-click → Open
6. Enter API token on first run

---

## Auto-Updates

### Setup

#### 1. Configure Repository

Update `package.json` with your GitHub repository:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
},
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_USERNAME",
    "repo": "YOUR_REPO_NAME"
  }
]
```

#### 2. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Copy the token

#### 3. Set Environment Variable

```bash
export GH_TOKEN="your_github_token_here"

# Make permanent:
echo 'export GH_TOKEN="your_github_token_here"' >> ~/.zshrc
source ~/.zshrc
```

### Publishing a Release

```bash
# 1. Update version in package.json
# 2. Commit changes
git add .
git commit -m "Release vX.X.X"
git push

# 3. Build and publish
npm run publish
```

### How Updates Work

1. App checks for updates 3 seconds after launch
2. Users can manually check via menu: "Downtick → Check for Updates..."
3. Update notification appears with version number
4. User clicks "Download Update"
5. Progress bar shows download status
6. After download, user can restart to install
7. If user chooses "Later", update installs on next app quit

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **Patch** (0.0.X): Bug fixes
- **Minor** (0.X.0): New features, backwards compatible
- **Major** (X.0.0): Breaking changes

---

## Code Signing & Notarization

### Why Notarize?

**Without notarization:**
- Users see "App is damaged and can't be opened"
- Must right-click → Open to bypass security
- Unprofessional appearance

**With notarization:**
- App opens normally with double-click
- No security warnings
- Professional distribution

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Developer ID Application certificate**
3. **App-Specific Password** for notarization

### Setup Steps

#### 1. Get Team ID

1. Go to https://developer.apple.com/account
2. Click "Membership"
3. Copy your Team ID (10 characters)
4. Update `package.json` line 46: Replace `YOUR_TEAM_ID` with your Team ID

#### 2. Install Certificate

Check existing certificates:
```bash
security find-identity -v -p codesigning
```

If no "Developer ID Application" certificate exists:
1. Go to https://developer.apple.com/account/resources/certificates/list
2. Create "Developer ID Application" certificate
3. Download and install it

#### 3. Create App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Security → App-Specific Passwords
3. Generate password labeled "Downtick Notarization"
4. Copy the password (format: `xxxx-xxxx-xxxx-xxxx`)

#### 4. Set Environment Variables

```bash
export APPLE_ID="your.email@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"

# Make permanent:
echo 'export APPLE_ID="your.email@example.com"' >> ~/.zshrc
echo 'export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"' >> ~/.zshrc
source ~/.zshrc
```

#### 5. Build with Notarization

```bash
npm run build:electron
```

This will:
1. Build the app
2. Code sign with your certificate
3. Upload to Apple for notarization (2-5 minutes)
4. Staple the notarization ticket

#### 6. Verify Notarization

```bash
# Extract built app
unzip dist/Downtick-{version}-mac.zip

# Check notarization status
spctl -a -vv Downtick.app
```

Should show: `source=Notarized Developer ID`

### Quick Checklist

- [ ] Apple Developer Account active
- [ ] Team ID updated in `package.json`
- [ ] Developer certificate installed
- [ ] App-specific password generated
- [ ] All three environment variables set (GH_TOKEN, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD)
- [ ] Test build completes successfully
- [ ] Notarization verification passes

---

## Configuration

### Security

- **Token Encryption**: AES-256-CBC with random IV
- **Local Storage**: Data stored in `~/Library/Application Support/Downtick/`
- **No External Servers**: All data stays on user's machine
- **HTTPS Only**: All API calls use HTTPS

### Data Storage

**Location:** `~/Library/Application Support/Downtick/`

**Files:**
- `user-data.json` - Encrypted API tokens

**To reset:** Delete this directory

### Dependencies

- **express**: Web server
- **axios**: HTTP client for API
- **electron**: Desktop app framework
- **electron-updater**: Auto-update functionality
- **Node.js built-ins**: crypto, fs, path

---

## Troubleshooting

### Common Issues

**"App is damaged and can't be opened"**
- Unsigned app security warning
- Solution: Right-click → Open, or notarize the app

**"Port already in use"**
```bash
lsof -ti:3737 | xargs kill
```

**"Invalid API token"**
- Get fresh token from your dashboard
- Delete `~/Library/Application Support/Downtick/user-data.json`

**Build fails**
```bash
rm -rf node_modules dist
npm install
npm run build:electron
```

**Updates not working**
- Verify `GH_TOKEN` is set: `echo $GH_TOKEN`
- Check repository URL in `package.json`
- Ensure `latest-mac.yml` exists in GitHub release

**Notarization fails**
- Check all environment variables are set
- Verify certificate is installed: `security find-identity -v -p codesigning`
- Ensure Apple Developer account is active
- Generate new app-specific password if needed

### Verification Commands

```bash
# Check environment variables
echo $GH_TOKEN
echo $APPLE_ID
echo $APPLE_APP_SPECIFIC_PASSWORD

# Check certificate
security find-identity -v -p codesigning

# Verify notarization
spctl -a -vv Downtick.app

# Check version
cat package.json | grep version
```

### Data Reset

To completely reset the app:
```bash
rm -rf ~/Library/Application\ Support/Downtick/
```

---

## Release Workflow

### Complete Release Process

1. **Make changes** to code
2. **Test locally**: `npm start`
3. **Update version** in `package.json`
4. **Commit changes**:
   ```bash
   git add .
   git commit -m "Release vX.X.X"
   git push
   ```
5. **Build and publish**:
   ```bash
   npm run publish
   ```
6. **Wait** for build + notarization (5-10 minutes)
7. **Verify** release on GitHub
8. **Test** update on another Mac

### Release Notes Template

```markdown
## What's New in vX.X.X

### Features
- New feature description

### Bug Fixes
- Fixed issue description

### Changes
- Updated component description

## Installation
Download the appropriate file for your Mac:
- Intel Macs: Downtick-X.X.X-mac.zip
- Apple Silicon: Downtick-X.X.X-arm64-mac.zip
```

---

## Support

For issues or questions, check:
- This guide for common solutions
- Console.app for error logs
- GitHub Issues (if using Git distribution)

---

## License

Internal use only. Proprietary.
