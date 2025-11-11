# Uptick Reporter

A **self-contained desktop application** for generating weekly variance reports from the Uptick API. Built with Node.js - simple, reliable, and easy to distribute.

## Features

- **Weekly Variance Report**: Identifies publisher sites with >10% week-over-week variance
- **Real-time Data**: Fetches directly from Uptick API
- **Secure Token Storage**: Encrypted locally using AES-256
- **Self-Contained**: Everything bundled in a single .app file
- **Zero Setup**: No installation required for end users
- **Auto-Updates**: Automatic update checking via GitHub Releases

## For End Users (Distribution)

### Running the App

1. **Download** `Uptick Reporter.app` (or extract from .zip)
2. **Double-click** to open
3. **Enter your API token** on first launch:
   - Get token from: https://dashboard.uptick.com/user/edit
   - Paste and click "Continue"
4. **View reports** automatically

That's it! No Ruby, no dependencies, no terminal commands.

### System Requirements

- macOS 10.13 or higher
- Node.js 14 or higher (https://nodejs.org)
- Internet connection (for Uptick API)

**Note**: The .app bundle will check for Node.js and prompt to install if missing.

## For Developers (Building & Distribution)

### Development Setup

```bash
cd /Users/jbell/CascadeProjects/uptick-reporter-electron

# Install dependencies
npm install

# Run the app (opens browser automatically)
npm start

# Or run just the server
npm run server
```

### Building for Distribution

#### Build with Electron Builder (Recommended)

```bash
# Build for local distribution
npm run build:electron

# Build and publish to GitHub Releases (auto-updates)
npm run publish
```

This creates:
- `dist/ALERtick-{version}-mac.zip` - Intel Mac build
- `dist/ALERtick-{version}-arm64-mac.zip` - Apple Silicon build
- `dist/latest-mac.yml` - Update metadata

#### Distribution Methods

**Method 1: GitHub Releases with Auto-Updates (Recommended)**
- Publish releases to GitHub
- Users get automatic update notifications
- One-click update installation
- See `AUTO_UPDATE_GUIDE.md` for setup

**Method 2: Direct Distribution**
- Share the `.zip` files
- Users extract and double-click
- No auto-update support

**Method 3: Legacy .app Bundle**
```bash
npm run build:mac
```
- Creates traditional macOS app bundle
- See `DISTRIBUTION_GUIDE.md` for details

### Documentation

- **`AUTO_UPDATE_GUIDE.md`** - Complete guide to setting up GitHub Releases auto-updates
- **`RELEASE_CHECKLIST.md`** - Quick reference for publishing new versions
- **`DISTRIBUTION_GUIDE.md`** - Distribution methods and user instructions
- **`ELECTRON_BUILD_GUIDE.md`** - Electron Builder configuration details

### File Structure

```
uptick-reporter-electron/
├── main.js                   # Electron main process (with auto-update)
├── launcher.js               # Legacy launcher script
├── standalone-server.js      # Express backend + API logic
├── package.json              # Dependencies & build config
├── create-macos-app.sh       # Build script for .app bundle
├── public/
│   ├── index.html           # Frontend HTML
│   ├── styles.css           # Styling
│   └── app.js               # Frontend JavaScript
└── README.md                # This file
```

### How It Works

1. **Launcher** starts Express server and opens browser automatically
2. **Express server** runs on localhost:3737
3. **JSON file** stores encrypted tokens locally (~/.../Application Support/Uptick Reporter)
4. **Axios** fetches data from Uptick API
5. **Frontend** displays reports in a clean web UI

### Security

- **Token Encryption**: AES-256-CBC with random IV
- **Local Storage**: JSON file in user's app data folder
- **No External Servers**: All data stays on user's machine
- **HTTPS Only**: All API calls to Uptick use HTTPS

### Customization

#### Change Variance Threshold

Edit `standalone-server.js`, line ~134:
```javascript
this.threshold = 10.0; // Change to desired percentage
```

#### Change Port

Edit `standalone-server.js`, line ~330:
```javascript
const PORT = 3737; // Change to different port
```

Also update in `launcher.js` line ~29.

#### Styling

Edit `public/styles.css` to customize colors, fonts, etc.

### Testing

#### Run in Dev Mode
```bash
npm start
```

#### Test with DevTools
```bash
npm run dev
```

This opens the app with Chrome DevTools for debugging.

### Troubleshooting

**"App is damaged and can't be opened"** (macOS)
- This happens with unsigned apps
- Right-click > Open (or use `xattr -cr "Uptick Reporter.app"`)

**Port already in use**
- Change port in `main.js`

**Data file issues**
- Close all instances of the app
- Delete `~/Library/Application Support/Uptick Reporter/user-data.json`

**Build fails**
- Ensure Node.js 16+ is installed
- Delete `node_modules` and run `npm install` again

### Dependencies

- **express**: Web server
- **axios**: HTTP client for Uptick API
- **Node.js built-ins**: crypto, fs, path (no external dependencies for encryption/storage)

### Supported Platforms

Currently configured for macOS. To add Windows/Linux:

1. Update `package.json` build config
2. Add platform-specific icons
3. Run platform-specific builds

### Version History

**1.0.0** (2025-11-06)
- Initial release
- Weekly variance report
- Multi-metric analysis (impressions, clicks, revenue, actions)
- Encrypted token storage

## Support

For issues or questions, contact your IT administrator.

## License

Internal use only. Proprietary.
