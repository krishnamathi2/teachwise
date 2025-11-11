const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;
let frontendProcess;

const isDev = !app.isPackaged;
const BACKEND_PORT = 3003;
const FRONTEND_PORT = 3000;

// Simple function to wait for server to be ready
function waitForServer(url, timeout = 60000, interval = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };
    
    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Server at ${url} did not start within ${timeout}ms`));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('Starting backend server...');
    const backendPath = isDev 
      ? path.join(__dirname, '..', 'backend')
      : path.join(process.resourcesPath, 'backend');
    
    console.log('Backend path:', backendPath);
    console.log('Backend index.js exists:', require('fs').existsSync(path.join(backendPath, 'index.js')));
    
    backendProcess = spawn('node', ['index.js'], {
      cwd: backendPath,
      stdio: 'inherit',
      shell: true
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      reject(err);
    });

    // Wait for backend to be ready
    console.log('Waiting for backend to be ready...');
    waitForServer(`http://localhost:${BACKEND_PORT}`, 30000, 1000)
      .then(() => {
        console.log('Backend server is ready');
        resolve();
      })
      .catch((err) => {
        console.error('Backend failed to start:', err);
        reject(err);
      });
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    if (!isDev) {
      // In production, start Next.js standalone server
      console.log('Starting frontend production server...');
      const frontendPath = path.join(process.resourcesPath, 'frontend', '.next', 'standalone');
      const serverPath = path.join(frontendPath, 'server.js');
      
      console.log('Frontend path:', frontendPath);
      console.log('Server.js exists:', require('fs').existsSync(serverPath));
      
      frontendProcess = spawn('node', ['server.js'], {
        cwd: frontendPath,
        env: { ...process.env, PORT: FRONTEND_PORT },
        stdio: 'inherit',
        shell: true
      });

      frontendProcess.on('error', (err) => {
        console.error('Failed to start frontend:', err);
        reject(err);
      });

      // Wait for frontend to be ready
      console.log('Waiting for frontend to be ready...');
      waitForServer(`http://localhost:${FRONTEND_PORT}`, 60000, 1000)
        .then(() => {
          console.log('Frontend server is ready');
          resolve();
        })
        .catch((err) => {
          console.error('Frontend failed to start:', err);
          reject(err);
        });
      return;
    }

    console.log('Starting frontend dev server...');
    const frontendPath = path.join(__dirname, '..', 'frontend');
    
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: frontendPath,
      stdio: 'inherit',
      shell: true
    });

    frontendProcess.on('error', (err) => {
      console.error('Failed to start frontend:', err);
      reject(err);
    });

    // Wait for frontend to be ready
    console.log('Waiting for frontend dev server to be ready...');
    waitForServer(`http://localhost:${FRONTEND_PORT}`, 60000, 1000)
      .then(() => {
        console.log('Frontend server is ready');
        resolve();
      })
      .catch(reject);
  });
}

function createWindow() {
  console.log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'TeachWise AI',
    backgroundColor: '#0f172a',
    show: false // Don't show until ready
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  const startURL = `http://localhost:${FRONTEND_PORT}`;
  console.log(`Loading URL: ${startURL}`);

  mainWindow.loadURL(startURL);

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  // Always open DevTools in production to see errors
  mainWindow.webContents.openDevTools();

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
}

async function startApp() {
  try {
    // Start backend first
    await startBackend();
    
    // Start frontend
    await startFrontend();
    
    // Create window
    createWindow();
  } catch (error) {
    console.error('Failed to start app:', error);
    app.quit();
  }
}

app.on('ready', startApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('Cleaning up processes...');
  
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (frontendProcess) {
    frontendProcess.kill();
  }
});

// Handle crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
