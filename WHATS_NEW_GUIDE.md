# What's New Feature Guide

## Overview
The "What's New" feature displays release notes to users when they first launch the app after an update. This helps users understand new features and improvements.

## How It Works

1. **Version Tracking**: The app tracks the last version a user has seen in their user data file
2. **Automatic Display**: When the app launches, it checks if the current version is different from the last seen version
3. **Modal Display**: If there's a new version, a modal automatically appears showing the release notes
4. **Mark as Seen**: When the user closes the modal, the current version is marked as seen

## Adding Release Notes for a New Version

When you release a new version, update `/public/whats-new.json`:

```json
{
  "1.0.1": {
    "version": "1.0.1",
    "date": "2024-12-15",
    "title": "Version 1.0.1 - Bug Fixes",
    "highlights": [
      "New feature description here",
      "Another new feature"
    ],
    "bugFixes": [
      "Fixed issue with...",
      "Resolved problem where..."
    ],
    "notes": "Optional additional notes about this release"
  },
  "1.0.0": {
    ...existing version...
  }
}
```

### JSON Structure

- **version**: Version number (must match package.json version)
- **date**: Release date in YYYY-MM-DD format
- **title**: Display title for the release
- **highlights**: Array of new features (optional)
- **bugFixes**: Array of bug fixes (optional)
- **notes**: Additional notes or important information (optional)

## Files Modified

- `/public/whats-new.json` - Release notes data
- `/standalone-server.js` - API endpoints for what's new
- `/public/index.html` - What's New modal HTML
- `/public/styles.css` - Modal styling
- `/public/app.js` - Frontend logic
- `/main.js` - Update notification message

## API Endpoints

- `GET /api/whats-new` - Get all release notes
- `GET /api/whats-new/:version` - Get release notes for specific version
- `GET /api/should-show-whats-new` - Check if what's new should be displayed
- `POST /api/version-seen` - Mark a version as seen by the user

## Testing

To test the What's New feature:

1. Delete or modify the `lastSeenVersion` field in your user data file:
   - Location: `~/Library/Application Support/Downtick/user-data.json`
   - Set `lastSeenVersion` to an older version or remove it entirely

2. Restart the app - the What's New modal should appear

3. Close the modal - it should not appear again until the version changes

## User Experience

- Modal appears automatically 1 second after app initialization
- Users can close it by:
  - Clicking the "Got it!" button
  - Clicking the X button
  - Clicking outside the modal
- Once closed, the version is marked as seen and won't show again
- After an update is downloaded, users are notified they'll see what's new after restart
