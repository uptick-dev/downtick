# CHANGELOG

## 0.0.7 > 1.0.0

### Features
### - Added a Monthly Variance Report, showing last three full months and current Month to Date 
### - Made the Max Variance column sortable by the variance on the Monthly Variance Report and Weekly Variance Report
### - Made the Change column sortable on the Low RPV Report
### - Added a tooltip to the RPV column that shows the number of views for that week
### - Added a button to download a PDF report of the Monthly and Weekly Variance Reports 
### - Added a threshold control to the Monthly and Weekly Variance Reports that allows users to change the variance threshold

### Bug Fixes
### - Fixed auto-updating by packaging app in a DMG file instead of a ZIP

### Versioning
### - App is now out of beta and is in 1.0 state

## 0.0.6 > 0.0.7 (Beta)

### - Removes unnecessary files
### - Hides notification that we're running on latest version during autocheck at app launch if there are no updates
### - Added a script to build unsigned app for testing more quickly (`npm run build:electron-unsigned`)
### - Added this changelog