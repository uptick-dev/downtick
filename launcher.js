#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const { app: electronApp } = process.versions.electron ? require('electron') : { app: null };

console.log('\n🚀 Starting Downtick...\n');

// Determine data directory
let userDataPath;
if (electronApp) {
  userDataPath = electronApp.getPath('userData');
} else {
  const os = require('os');
  userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'Downtick');
}

// Set environment variable for server
process.env.DOWNTICK_DATA_PATH = userDataPath;

// Start the server
const serverPath = path.join(__dirname, 'standalone-server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env }
});

// Open browser after delay
setTimeout(() => {
  console.log('✓ Opening browser...\n');
  exec('open http://localhost:3737');
}, 2000);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...\n');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit(0);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Server exited with code ${code}\n`);
  }
  process.exit(code || 0);
});
