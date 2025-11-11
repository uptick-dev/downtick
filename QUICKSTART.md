# Quick Start Guide - Uptick Reporter

## For You (Developer/First Time Setup)

### 1. Test the App Locally

```bash
cd /Users/jbell/CascadeProjects/uptick-reporter-electron

# Start the app
npm start
```

This will:
- ✅ Start the Express server
- ✅ Open your browser to http://localhost:3737
- ✅ Show you the setup screen

### 2. Configure Your Token

1. Get your Uptick API token from: https://dashboard.uptick.com/user/edit
2. Enter your email and token
3. Click "Continue"
4. View your variance report

### 3. Build for Distribution

```bash
npm run build:mac
```

This creates `Uptick Reporter.app` that you can share.

### 4. Test the App Bundle

```bash
open "Uptick Reporter.app"
```

It will open in Terminal and launch your browser.

### 5. Distribute

Compress the app:
```bash
zip -r "Uptick Reporter.zip" "Uptick Reporter.app"
```

Share the .zip file with your team!

---

## For End Users (Recipients)

### Requirements

- macOS 10.13+
- Node.js 14+ ([Install here](https://nodejs.org))

### Installation

1. **Extract** the .zip file
2. **Double-click** `Uptick Reporter.app`
3. **First run**: Dependencies will install automatically (takes 1-2 min)
4. **Enter your Uptick API token** when prompted
5. **View reports**!

### Using the App

- The app opens in Terminal and your browser
- Runs on http://localhost:3737
- **To stop**: Press `Ctrl+C` in Terminal
- **To restart**: Double-click the app again

### Troubleshooting

**"Uptick Reporter can't be opened"**
- Right-click the app → Open → Open again

**"Node.js is required"**
- Install from https://nodejs.org
- Or via Homebrew: `brew install node`

**"Port already in use"**
- Close other instances of the app
- Or kill the process: `lsof -ti:3737 | xargs kill`

**Fresh start**
- Delete: `~/Library/Application Support/Uptick Reporter/`
- Restart the app

---

## Features

### Weekly Variance Report

Shows publisher sites with >10% week-over-week variance in:
- **Impressions** - Total ad views
- **Clicks** - User clicks on ads
- **Revenue** - Money generated
- **Actions** - Conversions/signups

### Data Displayed

- **Week 1, 2, 3 values** - Actual numbers for each week
- **Max Variance** - Highest % change between any two weeks
- **Metric** - Which metric showed the variance

### Color Coding

- 🔵 **Blue (positive)** - Increase in metric
- 🔴 **Red (negative)** - Decrease in metric

---

## Security

- ✅ API tokens encrypted with AES-256
- ✅ Data stored locally only
- ✅ No external servers
- ✅ HTTPS for all Uptick API calls

---

## Support

Need help? Check:
- **README.md** - Full documentation
- **System logs** - Terminal output shows errors

To reset everything:
```bash
rm -rf ~/Library/Application\ Support/Uptick\ Reporter/
```
