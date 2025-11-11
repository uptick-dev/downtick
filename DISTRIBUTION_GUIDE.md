# Distribution Guide for Uptick Reporter

## Overview

This guide explains how to distribute the Uptick Reporter app to your organization. The app is self-contained and easy to share.

## What You're Distributing

**Uptick Reporter** - A desktop app that:
- Generates weekly variance reports from Uptick API data
- Runs entirely on the user's Mac
- Requires no complex installation
- Stores all data locally (encrypted)

## Prerequisites for Recipients

Recipients need:
1. **macOS 10.13 or higher**
2. **Node.js 14 or higher** - Download from https://nodejs.org

The app will check for Node.js and prompt users to install if missing.

---

## Distribution Method 1: .app Bundle (Recommended)

### Step 1: Build the App

```bash
cd /Users/jbell/CascadeProjects/uptick-reporter-electron
npm run build:mac
```

This creates: `Uptick Reporter.app`

### Step 2: Compress for Sharing

```bash
zip -r "Uptick Reporter.zip" "Uptick Reporter.app"
```

### Step 3: Distribute

Share `Uptick Reporter.zip` via:
- Email
- Slack/Teams
- Shared drive
- Internal file server

### Step 4: Provide Instructions

Send recipients this message:

```
Hi Team,

I've built a tool to analyze Uptick publisher variance data.

REQUIREMENTS:
- macOS 10.13+
- Node.js 14+ (install from https://nodejs.org)

INSTALLATION:
1. Extract the attached .zip file
2. Double-click "Uptick Reporter.app"
3. If prompted by security, right-click → Open
4. First run will install dependencies (1-2 minutes)
5. Enter your Uptick API token from dashboard.uptick.com/user/edit

The app will open in Terminal and your browser.

USAGE:
- Generates weekly variance reports automatically
- Shows publisher sites with >10% week-over-week changes
- To stop: Press Ctrl+C in Terminal
- To restart: Double-click the app again

Questions? Let me know!
```

---

## Distribution Method 2: Source Code

If recipients are technical, you can share the source code:

### Via Git Repository

```bash
# Create a private repo on GitHub/GitLab
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

Recipients can:
```bash
git clone <repo-url>
cd uptick-reporter-electron
npm install
npm start
```

### Via Zip File

```bash
zip -r uptick-reporter-source.zip . -x "node_modules/*" -x ".git/*" -x "*.app/*"
```

Recipients extract and run:
```bash
npm install
npm start
```

---

## Security Considerations

### What's Secure

✅ API tokens encrypted with AES-256
✅ Data stored locally only  
✅ No external servers
✅ All Uptick API calls use HTTPS

### What to Tell Users

- "Your API token is encrypted and stored only on your Mac"
- "No data leaves your computer except API calls to Uptick"
- "The app runs locally on port 3737"

### Access Control

- Distribute only to authorized team members
- Recipients need their own Uptick API tokens
- Tokens are user-specific (each person enters their own)

---

## Support & Maintenance

### Common User Issues

**"Can't open app - damaged"**
→ Right-click → Open (macOS security for unsigned apps)

**"Node.js required"**
→ Install from nodejs.org

**"Port already in use"**
→ Close other instances: `lsof -ti:3737 | xargs kill`

**"Invalid API token"**
→ Get fresh token from dashboard.uptick.com/user/edit

### Updating the App

**Automatic Updates (Recommended):**

The app now supports automatic updates via GitHub Releases. See `AUTO_UPDATE_GUIDE.md` for complete setup instructions.

Users can:
- Check for updates via the app menu: "ALERtick → Check for Updates..."
- Receive automatic update notifications on app startup
- Download and install updates with one click

**Manual Updates:**

To distribute updates manually:

1. Make your changes
2. Rebuild: `npm run build:mac`
3. Create new zip
4. Notify users to download the new version
5. Users replace old app with new one

### Getting Feedback

Set up a channel for:
- Bug reports
- Feature requests
- Usage questions

Consider creating:
- Slack channel (#uptick-reporter)
- Email alias (uptick-reporter-support@company.com)
- GitHub Issues (if using Git distribution)

---

## Customization for Your Org

### Change Variance Threshold

Default is 10%. To change:

Edit `standalone-server.js`, line 134:
```javascript
this.threshold = 15.0; // Now requires 15% variance
```

### Change Branding

1. **App Name**: Edit `create-macos-app.sh` line 6
2. **Bundle ID**: Edit `create-macos-app.sh` line 7
3. **UI Colors**: Edit `public/styles.css`
4. **Icon**: Replace `assets/icon.png` with your logo

### Add More Reports

Create new report types by:
1. Adding methods to `ReportGenerator` class
2. Creating new API routes in `standalone-server.js`
3. Adding UI in `public/` files

---

## Deployment Checklist

Before distributing:

- [ ] Test the .app bundle on a clean Mac
- [ ] Verify API token encryption works
- [ ] Check report generation with real Uptick data
- [ ] Test with multiple users/tokens
- [ ] Write release notes
- [ ] Prepare support documentation
- [ ] Test Node.js version check
- [ ] Verify browser auto-open works
- [ ] Test Ctrl+C shutdown

---

## License & Legal

This app is for **internal use only**.

Considerations:
- App accesses Uptick API (check your Uptick terms)
- Stores user API tokens (ensure compliance)
- Proprietary to your organization
- Not for public distribution

---

## Technical Details

### System Requirements

**Minimum:**
- macOS 10.13
- Node.js 14
- 50MB disk space

**Recommended:**
- macOS 11+
- Node.js 18+
- 100MB disk space

### Architecture

```
User double-clicks app
    ↓
App checks for Node.js
    ↓
Launcher starts Express server (port 3737)
    ↓
Browser opens automatically
    ↓
User enters API token
    ↓
Token encrypted & stored locally
    ↓
App fetches 3 weeks of Uptick data
    ↓
Calculates variances
    ↓
Displays report in browser
```

### Data Storage

Location: `~/Library/Application Support/Uptick Reporter/`

Files:
- `user-data.json` - Encrypted tokens

To reset: Delete this directory

### Network Usage

The app makes HTTPS requests to:
- `https://dashboard.uptick.com` (Uptick API)

No other external connections.

---

## FAQ for Recipients

**Q: Is this official Uptick software?**
A: No, this is an internal tool we built using the Uptick API.

**Q: Is my data secure?**
A: Yes. Your token is encrypted and stored only on your Mac. No data is sent anywhere except Uptick's API.

**Q: Can I run this on Windows/Linux?**
A: Currently macOS only. Contact us if you need other platforms.

**Q: Does this affect my Uptick account?**
A: No. It only reads data via the API. It can't modify anything.

**Q: How do I uninstall?**
A: Delete the app and `~/Library/Application Support/Uptick Reporter/`

**Q: Can multiple people use the same token?**
A: Yes, but we recommend each person use their own token for tracking.

---

## Contact

For questions about distribution:
- [Your Name]
- [Your Email]
- [Slack/Teams Handle]
