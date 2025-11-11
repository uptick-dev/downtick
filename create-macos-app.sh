#!/bin/bash

# Creates a self-contained macOS .app bundle for Uptick Reporter
set -e

APP_NAME="Uptick Reporter"
BUNDLE_ID="com.yourcompany.uptick-reporter"
VERSION="1.0.0"

echo "📦 Creating macOS app bundle: $APP_NAME.app"

# Create app bundle structure
rm -rf "$APP_NAME.app"
mkdir -p "$APP_NAME.app/Contents/MacOS"
mkdir -p "$APP_NAME.app/Contents/Resources"

# Create Info.plist
cat > "$APP_NAME.app/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launch.sh</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundleDisplayName</key>
    <string>$APP_NAME</string>
    <key>CFBundleVersion</key>
    <string>$VERSION</string>
    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

# Create launcher shell script
cat > "$APP_NAME.app/Contents/MacOS/launch.sh" << 'LAUNCHER_EOF'
#!/bin/bash

# Get the directory where the app bundle is located
APP_DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"

cd "$APP_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    osascript -e 'display dialog "Node.js is required to run Uptick Reporter.\n\nPlease install Node.js from:\nhttps://nodejs.org\n\nOr via Homebrew:\nbrew install node" buttons {"OK"} default button "OK" with icon stop with title "Uptick Reporter"'
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    osascript -e 'display dialog "Node.js 14 or higher is required.\n\nYour version: '"$(node -v)"'\n\nPlease update Node.js from:\nhttps://nodejs.org" buttons {"OK"} default button "OK" with icon stop with title "Uptick Reporter"'
    exit 1
fi

# Check if already running
if lsof -Pi :3737 -sTCP:LISTEN -t >/dev/null 2>&1; then
    osascript -e 'display dialog "Uptick Reporter is already running!" buttons {"Open Browser", "OK"} default button "Open Browser" with title "Uptick Reporter"' | grep "Open Browser" && open http://localhost:3737
    exit 0
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    osascript -e 'display notification "Installing dependencies..." with title "Uptick Reporter"'
    
    # Run npm install in Terminal so user can see progress
    osascript <<EOF
    tell application "Terminal"
        do script "cd '$APP_DIR' && echo 'Installing dependencies...' && npm install && echo '\nStarting Uptick Reporter...' && node launcher.js"
        activate
    end tell
EOF
else
    # Start the app in Terminal
    osascript <<EOF
    tell application "Terminal"
        do script "cd '$APP_DIR' && node launcher.js"
        activate
    end tell
EOF
fi
LAUNCHER_EOF

chmod +x "$APP_NAME.app/Contents/MacOS/launch.sh"

# Copy application files to Resources
echo "📋 Copying application files..."
rsync -av --exclude="$APP_NAME.app" \
    --exclude=".git" \
    --exclude="node_modules" \
    --exclude="dist" \
    --exclude="tmp" \
    --exclude="*.db" \
    --exclude="test-*.js" \
    --exclude="main.js" \
    --exclude="server.js" \
    --exclude="create-macos-app.sh" \
    . "$APP_NAME.app/Contents/Resources/"

# Create a README in the app
cat > "$APP_NAME.app/Contents/Resources/README.txt" << EOF
Uptick Reporter
================

This app will open in your Terminal and automatically launch your browser.

Requirements:
- Node.js 14 or higher (https://nodejs.org)

On first run, dependencies will be installed automatically.

The app runs on http://localhost:3737

To stop the app, press Ctrl+C in the Terminal window.
EOF

echo "✅ App bundle created: $APP_NAME.app"
echo ""
echo "📦 To distribute:"
echo "1. Right-click '$APP_NAME.app' and select 'Compress'"
echo "2. Share the resulting .zip file with your team"
echo ""
echo "Recipients should:"
echo "1. Extract the .zip file"
echo "2. Double-click 'Uptick Reporter.app' to run"
echo "3. If prompted by macOS security, right-click > Open"
echo ""
echo "🧪 To test locally:"
echo "  open '$APP_NAME.app'"
