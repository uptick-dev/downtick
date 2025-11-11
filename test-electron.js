try {
  const electron = require('electron');
  console.log('Electron loaded:', electron);
  console.log('App:', electron.app);
  console.log('BrowserWindow:', electron.BrowserWindow);
} catch (error) {
  console.error('Error loading electron:', error);
}
