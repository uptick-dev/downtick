# Uptick Reporter

A self-contained desktop application for generating weekly variance reports from the Uptick API.

## Features

- **Weekly Variance Report**: Identifies publisher sites with >10% week-over-week variance
- **Real-time Data**: Fetches directly from Uptick API
- **Secure Token Storage**: Encrypted locally using AES-256
- **Self-Contained**: Everything bundled in a single .app file
- **Auto-Updates**: Automatic update checking via GitHub Releases

## Quick Start

### For End Users

1. Download and extract `ALERtick.app` from .zip
2. Double-click to open
3. If macOS blocks it: Right-click → Open
4. Enter your API token from https://dashboard.uptick.com/user/edit
5. View your reports

**System Requirements:** macOS 10.13 or higher

### For Developers

```bash
# Install and run
npm install
npm start

# Build for distribution
npm run build:electron

# Build and publish with auto-updates
npm run publish
```

## Documentation

See **[GUIDE.md](GUIDE.md)** for complete documentation including:
- Development setup
- Building & distribution
- Auto-updates configuration
- Code signing & notarization
- Troubleshooting

## Project Structure

```
uptick-reporter-electron/
├── main.js                   # Electron main process
├── standalone-server.js      # Express backend + API logic
├── package.json              # Dependencies & build config
├── public/                   # Frontend files (HTML/CSS/JS)
└── build/                    # Build configuration
```

## Security

- **Token Encryption**: AES-256-CBC
- **Local Storage**: Data stored in `~/Library/Application Support/Uptick Reporter/`
- **No External Servers**: All data stays on user's machine
- **HTTPS Only**: All API calls use HTTPS

## License

Internal use only. Proprietary.
