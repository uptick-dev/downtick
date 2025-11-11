console.log('Starting minimal test...');

try {
  const electron = require('electron');
  console.log('Electron module type:', typeof electron);
  console.log('Electron module:', electron);
  
  const { app, BrowserWindow } = require('electron');
  console.log('app:', typeof app);
  console.log('BrowserWindow:', typeof BrowserWindow);
  
  if (app) {
    app.whenReady().then(() => {
      console.log('App is ready!');
      app.quit();
    });
  }
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
