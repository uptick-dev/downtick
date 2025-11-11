# Quick Start - Auto-Updates

Get your app set up with automatic updates in 5 minutes.

## Prerequisites

✅ GitHub account  
✅ GitHub repository for your app  
✅ Node.js installed  

## Step 1: Configure Repository (2 minutes)

Edit `package.json` and replace placeholders:

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

**Example:**
```json
"repository": {
  "type": "git",
  "url": "https://github.com/acme/alertick.git"
},
"publish": [
  {
    "provider": "github",
    "owner": "acme",
    "repo": "alertick"
  }
]
```

## Step 2: Create GitHub Token (1 minute)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it: "ALERtick Releases"
4. Check: `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

## Step 3: Set Environment Variable (1 minute)

**macOS/Linux:**
```bash
export GH_TOKEN="paste_your_token_here"

# Make it permanent:
echo 'export GH_TOKEN="paste_your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

**Windows:**
```cmd
set GH_TOKEN=paste_your_token_here
```

## Step 4: Publish Your First Release (1 minute)

```bash
# Update version in package.json first
# Then run:
npm run publish
```

That's it! 🎉

## What Happens Next?

1. **Build completes** - Creates distributable files
2. **Release created** - Appears on GitHub
3. **Users notified** - Existing users see update prompt
4. **One-click install** - Users download and install automatically

## User Experience

When you publish a new version:

```
User opens app
    ↓
"Update available: v0.0.4"
    ↓
User clicks "Download Update"
    ↓
Progress bar shows download
    ↓
"Update ready - Restart now?"
    ↓
App restarts with new version
```

## Publishing Future Updates

Every time you want to release:

1. **Update version** in `package.json`
   ```json
   "version": "0.0.4"  // Increment this
   ```

2. **Commit changes**
   ```bash
   git add .
   git commit -m "Release v0.0.4"
   git push
   ```

3. **Publish**
   ```bash
   npm run publish
   ```

## Verification

Check your release at:
```
https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/releases
```

You should see:
- ✅ Version tag (e.g., `v0.0.4`)
- ✅ `ALERtick-{version}-mac.zip`
- ✅ `ALERtick-{version}-arm64-mac.zip`
- ✅ `latest-mac.yml`

## Testing

1. Install the current version
2. Publish a new version
3. Open the installed app
4. Click "ALERtick → Check for Updates..."
5. Verify update notification appears

## Need More Help?

- **Complete guide**: `AUTO_UPDATE_GUIDE.md`
- **Release checklist**: `RELEASE_CHECKLIST.md`
- **Troubleshooting**: `AUTO_UPDATE_GUIDE.md#troubleshooting`

## Common Issues

**"GH_TOKEN not set"**
```bash
echo $GH_TOKEN  # Should show your token
# If empty, run Step 3 again
```

**"Repository not found"**
- Check `package.json` has correct GitHub URL
- Verify token has `repo` permissions

**"Version already exists"**
- Increment version number in `package.json`
- Or delete the existing release on GitHub

## Next Steps

✅ You're done! Your app now has auto-updates.

Users will automatically be notified when you publish new versions.

---

**Pro Tip**: Add release notes when publishing:

```bash
# After npm run publish, go to GitHub releases
# Click "Edit" on the new release
# Add notes about what's new
```
