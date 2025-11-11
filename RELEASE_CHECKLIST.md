# Release Checklist

Quick reference for publishing new versions with auto-update support.

## Before Your First Release

1. **Set up GitHub repository**
   - Create a GitHub repository for your app
   - Update `package.json` with your repository details:
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

2. **Create GitHub Personal Access Token**
   - Go to: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Save the token securely

3. **Set environment variable**
   ```bash
   export GH_TOKEN="your_github_token_here"
   # Add to ~/.zshrc to make permanent
   echo 'export GH_TOKEN="your_github_token_here"' >> ~/.zshrc
   ```

## Publishing a New Release

### 1. Update Version
Edit `package.json`:
```json
{
  "version": "0.0.4"  // Increment from current version
}
```

### 2. Commit Changes
```bash
git add .
git commit -m "Release v0.0.4"
git push
```

### 3. Build and Publish
```bash
npm run publish
```

This will:
- Build the app for macOS (Intel + ARM)
- Create a GitHub release
- Upload distributable files
- Generate update metadata

### 4. Verify Release
1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/releases`
2. Check that the release contains:
   - `ALERtick-{version}-mac.zip`
   - `ALERtick-{version}-arm64-mac.zip`
   - `latest-mac.yml`

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.0.X): Bug fixes, minor changes
  - Example: `0.0.3` → `0.0.4`
  
- **Minor** (0.X.0): New features, backwards compatible
  - Example: `0.0.4` → `0.1.0`
  
- **Major** (X.0.0): Breaking changes
  - Example: `0.1.0` → `1.0.0`

## Testing Updates

### Test Before Publishing
```bash
# Build locally without publishing
npm run build:electron
```

### Test After Publishing
1. Install the previous version on a test Mac
2. Publish the new version
3. Open the installed app
4. Click "ALERtick → Check for Updates..."
5. Verify update notification appears
6. Test download and installation

## Troubleshooting

### "GH_TOKEN not set"
```bash
export GH_TOKEN="your_token_here"
```

### "Repository not found"
- Check `package.json` repository URL
- Verify GitHub token has correct permissions

### "Version already exists"
- Increment version number in `package.json`
- Delete the existing release on GitHub if needed

### Build fails
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run publish
```

## Quick Commands

```bash
# Check current version
cat package.json | grep version

# Build without publishing
npm run build:electron

# Build and publish
npm run publish

# View releases
open https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/releases
```

## Release Notes Template

When creating a release, add notes like:

```markdown
## What's New in v0.0.4

### Features
- Added automatic update checking
- New "Check for Updates" menu item

### Bug Fixes
- Fixed issue with API token validation
- Improved error handling

### Changes
- Updated UI styling
- Performance improvements

## Installation

Download and extract the appropriate file for your Mac:
- Intel Macs: `ALERtick-0.0.4-mac.zip`
- Apple Silicon: `ALERtick-0.0.4-arm64-mac.zip`

## Updating

If you have a previous version installed, the app will automatically notify you of this update.
```

## CI/CD (Optional)

For automated releases, see `AUTO_UPDATE_GUIDE.md` for GitHub Actions setup.

## Support

For detailed information, see:
- `AUTO_UPDATE_GUIDE.md` - Complete auto-update documentation
- `DISTRIBUTION_GUIDE.md` - Distribution methods
- `ELECTRON_BUILD_GUIDE.md` - Build configuration
