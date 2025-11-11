#!/bin/bash

# Notarization script for ALERtick
# You'll need:
# 1. Your Apple ID email
# 2. Your Team ID: M3Q9SM4LDD
# 3. An app-specific password from appleid.apple.com

echo "🔐 ALERtick Notarization"
echo ""

# Check if app-specific password is provided
if [ -z "$APPLE_PASSWORD" ]; then
    echo "Please set your app-specific password:"
    echo "  export APPLE_PASSWORD='xxxx-xxxx-xxxx-xxxx'"
    echo ""
    echo "Get one from: https://appleid.apple.com → Security → App-Specific Passwords"
    exit 1
fi

# Check if Apple ID is provided
if [ -z "$APPLE_ID" ]; then
    echo "Please set your Apple ID email:"
    echo "  export APPLE_ID='your@email.com'"
    exit 1
fi

TEAM_ID="M3Q9SM4LDD"

echo "📦 Notarizing x64 build..."
xcrun notarytool submit dist/ALERtick-0.0.3-mac.zip \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "$APPLE_PASSWORD" \
    --wait

echo ""
echo "📦 Notarizing arm64 build..."
xcrun notarytool submit dist/ALERtick-0.0.3-arm64-mac.zip \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "$APPLE_PASSWORD" \
    --wait

echo ""
echo "✅ Notarization complete!"
echo ""
echo "Note: Stapling is not needed for .zip files."
echo "Users can extract and run the app without warnings."
