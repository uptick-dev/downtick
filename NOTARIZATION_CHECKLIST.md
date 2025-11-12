# Notarization Checklist

Quick checklist for setting up code signing and notarization.

## ☐ Prerequisites

- [ ] Apple Developer Account ($99/year)
- [ ] Active membership at https://developer.apple.com/account

## ☐ Step 1: Get Team ID

- [ ] Go to: https://developer.apple.com/account
- [ ] Click "Membership"
- [ ] Copy your Team ID (10 characters)
- [ ] Update `package.json` line 46: Replace `YOUR_TEAM_ID` with your actual Team ID

## ☐ Step 2: Install Certificate

- [ ] Run: `security find-identity -v -p codesigning`
- [ ] If no "Developer ID Application" certificate exists:
  - [ ] Go to: https://developer.apple.com/account/resources/certificates/list
  - [ ] Create "Developer ID Application" certificate
  - [ ] Download and install it
- [ ] Verify: `security find-identity -v -p codesigning` shows your certificate

## ☐ Step 3: Create App-Specific Password

- [ ] Go to: https://appleid.apple.com/account/manage
- [ ] Security → App-Specific Passwords
- [ ] Generate password labeled "ALERtick Notarization"
- [ ] Copy the password (format: `xxxx-xxxx-xxxx-xxxx`)

## ☐ Step 4: Set Environment Variables

- [ ] Set GitHub token:
  ```bash
  export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  ```

- [ ] Set Apple ID:
  ```bash
  export APPLE_ID="your.email@example.com"
  ```

- [ ] Set app-specific password:
  ```bash
  export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
  ```

- [ ] Make permanent (add to `~/.zshrc`):
  ```bash
  echo 'export GH_TOKEN="your_token"' >> ~/.zshrc
  echo 'export APPLE_ID="your.email@example.com"' >> ~/.zshrc
  echo 'export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"' >> ~/.zshrc
  source ~/.zshrc
  ```

- [ ] Verify all three:
  ```bash
  echo $GH_TOKEN
  echo $APPLE_ID
  echo $APPLE_APP_SPECIFIC_PASSWORD
  ```

## ☐ Step 5: Test Build

- [ ] Run: `npm run build:electron`
- [ ] Watch for "notarizing" message
- [ ] Wait for "notarization successful" (2-5 minutes)
- [ ] Check `dist/` folder for zip files

## ☐ Step 6: Verify Notarization

- [ ] Extract the built app
- [ ] Run: `spctl -a -vv ALERtick.app`
- [ ] Should show: `source=Notarized Developer ID`

## ☐ Step 7: Publish

- [ ] Update version in `package.json`
- [ ] Commit changes: `git add . && git commit -m "Release vX.X.X"`
- [ ] Push: `git push`
- [ ] Publish: `npm run publish`
- [ ] Wait for build + notarization (5-10 minutes)
- [ ] Check GitHub releases page

## ☐ Step 8: Test on Another Mac

- [ ] Download release from GitHub
- [ ] Extract zip file
- [ ] Double-click app
- [ ] Should open without warnings!

## Quick Verification Commands

```bash
# Check all environment variables
echo "GH_TOKEN: ${GH_TOKEN:0:10}..."
echo "APPLE_ID: $APPLE_ID"
echo "APPLE_APP_SPECIFIC_PASSWORD: ${APPLE_APP_SPECIFIC_PASSWORD:0:4}..."

# Check certificate
security find-identity -v -p codesigning

# Check Team ID in package.json
grep -A 2 "notarize" package.json
```

## Common Issues

### ❌ "No identity found"
**Fix:** Install Developer ID Application certificate

### ❌ "APPLE_ID not set"
**Fix:** `export APPLE_ID="your.email@example.com"`

### ❌ "Invalid credentials"
**Fix:** Generate new app-specific password

### ❌ "Invalid Team ID"
**Fix:** Update Team ID in `package.json`

### ❌ Notarization times out
**Fix:** Check Apple Developer account status

## You're Done When...

✅ `npm run build:electron` completes with "notarization successful"
✅ `spctl -a -vv ALERtick.app` shows "Notarized Developer ID"
✅ App opens on another Mac without warnings
✅ `npm run publish` creates GitHub release
✅ Auto-updates work smoothly

## Need More Help?

See `NOTARIZATION_SETUP.md` for detailed instructions.
