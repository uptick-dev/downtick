#!/bin/bash

echo "This script will fix keychain access for codesigning"
echo ""
echo "You'll be prompted for your Mac login password"
echo ""

# Unlock the keychain first
security unlock-keychain ~/Library/Keychains/login.keychain-db

# Set the partition list
security set-key-partition-list -S apple-tool:,apple:,codesign: -s ~/Library/Keychains/login.keychain-db

echo ""
echo "✅ Keychain configured for codesigning"
echo ""
echo "Now run: npm run build:electron"
