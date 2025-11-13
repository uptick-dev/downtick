# Downtick

A self-contained desktop application for generating weekly variance reports.

## Features

- **Weekly Variance Report**: Identifies publisher sites with >10% week-over-week variance
- **Low RPV Alerts**: Identifies publisher sites with <$0.20 RPV
- **No Activity Alerts**: Identifies publisher sites with views last week but no views yesterday.
- **Real-time Data**: Fetches directly from API; cached daily but can be refreshed
- **Secure Token Storage**: Encrypted locally using AES-256
- **Self-Contained**: Everything bundled in a single .app file
- **Auto-Updates**: Automatic updates

## Quick Start

### For End Users

1. Choose your version from the [releases](https://github.com/uptick-dev/downtick/releases) page; arm-64 for M1 Macs or later, otherwise choose the standard version
2. Download and extract `Downtick.app` from .zip
3. Double-click to open
4. Enter your Uptick email and API token
5. View your reports

**System Requirements:** macOS 10.13 or higher

### For Developers

Note: this requires codesigning and notarization from Apple. See [GUIDE.md](GUIDE.md) for more information.

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
downtick/
├── main.js                   # Electron main process
├── standalone-server.js      # Express backend + API logic
├── package.json              # Dependencies & build config
├── public/                   # Frontend files (HTML/CSS/JS)
└── build/                    # Build configuration
```

## Security

- **Token Encryption**: AES-256-CBC
- **Local Storage**: Data stored in `~/Library/Application Support/Downtick/`
- **No External Servers**: All data stays on user's machine
- **HTTPS Only**: All API calls use HTTPS

## License

Internal use only. Proprietary.
