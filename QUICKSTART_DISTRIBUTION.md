# Quick Start: Distribute Your App in 5 Minutes

## The Fastest Way to Share Your App

### Step 1: Build It (2 minutes)

```bash
cd /Users/jbell/CascadeProjects/uptick-reporter-electron
npm run build:electron
```

Wait for it to complete. You'll see: `dist/Uptick Reporter-1.0.0.dmg`

### Step 2: Test It (1 minute)

```bash
open "dist/Uptick Reporter.app"
```

Make sure it works!

### Step 3: Share It (2 minutes)

Upload `dist/Uptick Reporter-1.0.0.dmg` to:
- Google Drive
- Dropbox
- Slack
- Email (if under 25MB)

### Step 4: Send Instructions

Copy/paste this to your team:

---

**📥 Download ALERtick - Uptick Reporter**

[Insert your download link here]

**Installation:**
1. Download and open the DMG file
2. Drag "Uptick Reporter" to Applications
3. Open from Applications folder
4. If blocked by security: Right-click → Open → Open
5. Enter your Uptick API token from: https://dashboard.uptick.com/user/edit

**Usage:**
- View weekly RPV variance reports
- Monitor low RPV alerts
- Track inactive publishers

Questions? Reply to this message.

---

## That's It!

Your app is now distributed. Users can run it like any Mac app.

## Alternative: Lightweight Version

If the Electron app is too large (200MB), use the lightweight version:

```bash
npm run build:mac
zip -r "Uptick Reporter.zip" "Uptick Reporter.app"
```

Share the ZIP (1MB) but users need Node.js installed.

## Troubleshooting

**Build fails?**
```bash
rm -rf node_modules dist
npm install
npm run build:electron
```

**Need help?** See `ELECTRON_BUILD_GUIDE.md` for detailed instructions.
