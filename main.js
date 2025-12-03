const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let serverModule;
let serverPort = 3737;
let isManualUpdateCheck = false;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Log auto-updater configuration for debugging
console.log('Auto-updater configuration:');
console.log('- App version:', app.getVersion());
console.log('- Auto download:', autoUpdater.autoDownload);
console.log('- Auto install on quit:', autoUpdater.autoInstallOnAppQuit);
console.log('- Update feed URL:', autoUpdater.getFeedURL() || 'Not set (will use default GitHub releases)');
console.log('- Platform:', process.platform);
console.log('- Arch:', process.arch);

// For private repos, you may need to set GH_TOKEN
if (process.env.GH_TOKEN) {
  console.log('- GitHub token: Set');
  autoUpdater.requestHeaders = { 'Authorization': `token ${process.env.GH_TOKEN}` };
} else {
  console.log('- GitHub token: Not set (public repo assumed)');
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  console.log('Checking GitHub repo: uptick-dev/downtick');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  console.log('Update info:', JSON.stringify(info, null, 2));
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available!`,
    buttons: ['Download Update', 'Later'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 0) {
      console.log('Starting update download...');
      autoUpdater.downloadUpdate().catch(err => {
        console.error('Download initiation failed:', err);
      });
    }
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('No updates available');
  // Only show dialog if this was a manual check
  if (mainWindow && isManualUpdateCheck) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'No Updates',
      message: 'You are running the latest version.',
      buttons: ['OK']
    });
  }
  // Reset the flag
  isManualUpdateCheck = false;
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total} bytes)`;
  console.log(message);
  if (mainWindow) {
    mainWindow.setProgressBar(progressObj.percent / 100);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
  }
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded. The app will restart to install the update. You'll see what's new when it reopens!`,
    buttons: ['Restart Now', 'Later'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  console.error('Error stack:', err.stack);
  
  // Determine error message based on error type
  let errorMessage = 'An error occurred while checking for updates.';
  let detailMessage = '';
  
  if (err.message) {
    if (err.message.includes('net::ERR_')) {
      errorMessage = 'Network error while checking for updates.';
      detailMessage = 'Please check your internet connection and try again.';
    } else if (err.message.includes('404') || err.message.includes('Not Found')) {
      errorMessage = 'Update server not found.';
      detailMessage = 'The update server may be temporarily unavailable. Please try again later.';
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
      errorMessage = 'Cannot connect to update server.';
      detailMessage = 'Please check your internet connection and firewall settings.';
    } else if (err.message.includes('HttpError')) {
      errorMessage = 'Update server error.';
      detailMessage = err.message;
    } else {
      detailMessage = err.message;
    }
  }
  
  if (mainWindow) {
    const dialogMessage = detailMessage ? `${errorMessage}\n\n${detailMessage}` : errorMessage;
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: dialogMessage,
      buttons: ['OK']
    });
  }
  
  // Reset progress bar if it was set
  if (mainWindow) {
    mainWindow.setProgressBar(-1);
  }
});

async function startServer() {
  // Import and start the standalone server directly
  // This works with asar packaging
  serverModule = require('./standalone-server.js');
  
  try {
    await serverModule.startServer();
    console.log('Server started on port', serverPort);
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

function stopServer() {
  if (serverModule && serverModule.stopServer) {
    serverModule.stopServer();
  }
}

function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            isManualUpdateCheck = true;
            autoUpdater.checkForUpdates();
          }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { 
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.reload();
          }
        },
        { 
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+CmdOrCtrl+I',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Downtick'
  });

  // Load the local server
  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Intercept external links and open them in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external URLs in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation within the app
    if (url.startsWith(`http://localhost:${serverPort}`)) {
      return;
    }
    // Open external URLs in default browser and prevent navigation
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Create the menu first
  createMenu();
  
  // Start the Express server
  try {
    await startServer();
    console.log(`Server started on port ${serverPort}`);
    createWindow();
    
    // Check for updates on startup (silently)
    if (!process.argv.includes('--dev')) {
      setTimeout(() => {
        isManualUpdateCheck = false;
        autoUpdater.checkForUpdates();
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopServer();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Cleanup before quitting
app.on('before-quit', () => {
  stopServer();
});

// Handle app termination
app.on('will-quit', () => {
  stopServer();
});
