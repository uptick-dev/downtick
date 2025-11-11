# Auto-Update Setup Guide

This guide explains how to set up and use the auto-update functionality for ALERtick using GitHub Releases.

## Overview

ALERtick uses `electron-updater` to automatically check for and install updates from GitHub Releases. Users can:
- Check for updates manually via the app menu
- Receive automatic update notifications on startup
- Download and install updates with a single click

## Prerequisites

1. **GitHub Repository**: Your app must be hosted in a GitHub repository
2. **GitHub Token**: You need a GitHub Personal Access Token for publishing releases
3. **Code Signing** (Recommended): For production, sign your app to avoid security warnings

## Configuration

### 1. Update package.json

Replace the placeholder values in `package.json`:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
},
```

```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_USERNAME",
    "repo": "YOUR_REPO_NAME"
  }
]
```

**Example:**
```json
"repository": {
  "type": "git",
  "url": "https://github.com/mycompany/alertick.git"
},
"publish": [
  {
    "provider": "github",
    "owner": "mycompany",
    "repo": "alertick"
  }
]
```

### 2. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "ALERtick Release Token")
4. Select scopes:
   - `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### 3. Set Environment Variable

Add your GitHub token to your environment:

**macOS/Linux:**
```bash
export GH_TOKEN="your_github_token_here"
```

Add to `~/.zshrc` or `~/.bash_profile` to make it permanent:
```bash
echo 'export GH_TOKEN="your_github_token_here"' >> ~/.zshrc
source ~/.zshrc
```

**Windows:**
```cmd
set GH_TOKEN=your_github_token_here
```

## Building and Publishing a Release

### Step 1: Update Version Number

Update the version in `package.json`:
```json
{
  "version": "0.0.4"
}
```

Follow [Semantic Versioning](https://semver.org/):
- **Patch** (0.0.X): Bug fixes
- **Minor** (0.X.0): New features, backwards compatible
- **Major** (X.0.0): Breaking changes

### Step 2: Build the App

```bash
npm run build:electron
```

This creates distributable files in the `dist/` directory.

### Step 3: Publish to GitHub Releases

```bash
npx electron-builder --mac --publish always
```

Options:
- `--publish always`: Always publish to GitHub
- `--publish never`: Build only, don't publish
- `--publish onTag`: Publish only if the current commit is tagged

### Step 4: Verify the Release

1. Go to your GitHub repository
2. Click on "Releases"
3. You should see a new release with:
   - Version tag (e.g., `v0.0.4`)
   - Release notes
   - Attached files:
     - `ALERtick-{version}-mac.zip` (Intel)
     - `ALERtick-{version}-arm64-mac.zip` (Apple Silicon)
     - `latest-mac.yml` (update metadata)

## How Updates Work

### For Users

1. **Automatic Check**: The app checks for updates 3 seconds after launch
2. **Manual Check**: Users can click "Check for Updates..." in the app menu
3. **Update Available**: A dialog appears with the new version number
4. **Download**: User clicks "Download Update" to start downloading
5. **Progress**: A progress bar shows download status
6. **Install**: After download, user can restart to install or wait
7. **Auto-install**: If user chooses "Later", update installs on next app quit

### Update Flow Diagram

```
App Starts → Check for Updates (3s delay)
                    ↓
            Update Available?
               ↙        ↘
             No         Yes
              ↓          ↓
      Show "Up to date"  Show "Update Available"
                         ↓
                    User Downloads
                         ↓
                  Download Progress
                         ↓
                  Update Downloaded
                         ↓
                    User Restarts
                         ↓
                  Update Installed
```

## Testing Updates

### Test in Development

1. Build and publish version `0.0.3`:
   ```bash
   npm run build:electron
   npx electron-builder --mac --publish always
   ```

2. Install the app on your system

3. Update version to `0.0.4` in `package.json`

4. Build and publish again:
   ```bash
   npm run build:electron
   npx electron-builder --mac --publish always
   ```

5. Open the installed app (version 0.0.3)

6. Click "Check for Updates..." in the menu

7. You should see an update notification for version 0.0.4

### Test with dev-app-update.yml

For local testing without publishing, create `dev-app-update.yml`:

```yaml
version: 0.0.4
files:
  - url: ALERtick-0.0.4-mac.zip
    sha512: [hash]
path: ALERtick-0.0.4-mac.zip
sha512: [hash]
releaseDate: '2024-01-01T00:00:00.000Z'
```

Set environment variable:
```bash
export ELECTRON_UPDATER_DEV_UPDATE_CONFIG=dev-app-update.yml
```

## Troubleshooting

### Updates Not Working

1. **Check GitHub token**: Ensure `GH_TOKEN` is set correctly
2. **Verify repository URL**: Check `package.json` repository field
3. **Check release files**: Ensure `latest-mac.yml` exists in the release
4. **Console logs**: Run app with `--dev` flag to see update logs

### "Update Not Available" When It Should Be

1. **Version comparison**: Ensure new version > current version
2. **Cache**: Clear app cache and try again
3. **Release draft**: Ensure release is published, not draft
4. **Architecture**: Ensure you're testing with the correct architecture (Intel vs ARM)

### Code Signing Issues

If users see "App is damaged" warnings:
1. Sign your app with a valid Apple Developer certificate
2. Notarize the app with Apple
3. See `DISTRIBUTION_GUIDE.md` for code signing setup

## Security Best Practices

1. **Never commit tokens**: Don't add `GH_TOKEN` to version control
2. **Use environment variables**: Store tokens in environment variables
3. **Limit token scope**: Only grant necessary permissions
4. **Rotate tokens**: Regularly update your GitHub tokens
5. **Code sign releases**: Always sign production releases

## Advanced Configuration

### Custom Update Server

If you want to host updates on your own server:

```json
"publish": [
  {
    "provider": "generic",
    "url": "https://your-update-server.com/releases"
  }
]
```

### Update Channels

Support beta/alpha channels:

```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_USERNAME",
    "repo": "YOUR_REPO_NAME",
    "channel": "beta"
  }
]
```

In code:
```javascript
autoUpdater.channel = 'beta';
```

### Silent Updates

For automatic silent updates (not recommended for user-facing apps):

```javascript
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build and publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npm run build:electron
          npx electron-builder --mac --publish always
```

To trigger a release:
```bash
git tag v0.0.4
git push origin v0.0.4
```

## Resources

- [electron-updater Documentation](https://www.electron.build/auto-update)
- [electron-builder Publishing](https://www.electron.build/configuration/publish)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Semantic Versioning](https://semver.org/)
