const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');

app.setName('AAPESH');
const dataDirectory =
  process.env.AAPESH_USER_DATA_DIR || path.join(app.getPath('appData'), 'AAPESH');
fs.mkdirSync(dataDirectory, { recursive: true });
app.setPath('userData', dataDirectory);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  const isPackaged = app.isPackaged;
  const rootDirectory = path.resolve(__dirname, '..');
  const startupPage = path.join(__dirname, 'startup.html');
  const portFile = path.join(dataDirectory, 'backend-port.json');
  let mainWindow = null;
  let backendProcess = null;
  let backendPort = null;
  let backendStartPromise = null;
  let isShuttingDown = false;
  let allowQuit = false;
  const smokeTest = process.argv.includes('--smoke-test');

  function readSavedPort() {
    try {
      const value = JSON.parse(fs.readFileSync(portFile, 'utf8')).port;
      return Number.isInteger(value) && value > 0 && value < 65536 ? value : 0;
    } catch {
      return 0;
    }
  }

  function savePort(port) {
    fs.mkdirSync(dataDirectory, { recursive: true });
    const temporaryPath = `${portFile}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify({ port }), { mode: 0o600 });
    fs.renameSync(temporaryPath, portFile);
  }

  function getLogStream() {
    const logsDirectory = path.join(dataDirectory, 'logs');
    fs.mkdirSync(logsDirectory, { recursive: true });
    const logPath = path.join(logsDirectory, 'backend.log');
    try {
      if (fs.existsSync(logPath) && fs.statSync(logPath).size > 5 * 1024 * 1024) {
        fs.renameSync(logPath, `${logPath}.1`);
      }
    } catch {}
    return fs.createWriteStream(logPath, { flags: 'a' });
  }

  function requestHealth(port) {
    return new Promise((resolve) => {
      const request = http.get(
        { hostname: '127.0.0.1', port, path: '/api/health', timeout: 1200 },
        (response) => {
          response.resume();
          resolve(response.statusCode === 200);
        },
      );
      request.on('timeout', () => request.destroy());
      request.on('error', () => resolve(false));
    });
  }

  async function waitForHealth(port, child) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error('The backend exited during startup.');
      if (await requestHealth(port)) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('The backend did not become ready within 30 seconds.');
  }

  function stopChild(child, timeoutMs = 5000) {
    if (!child || child.exitCode !== null) return Promise.resolve();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (child.exitCode === null) child.kill();
      }, timeoutMs);
      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      try {
        child.stdin.write('AAPESH_SHUTDOWN\n');
        child.stdin.end();
      } catch {
        child.kill();
      }
    });
  }

  function spawnBackend(port) {
    return new Promise((resolve, reject) => {
      const frontendDirectory = isPackaged
        ? path.join(process.resourcesPath, 'frontend')
        : path.join(rootDirectory, 'frontend', 'dist');
      const env = {
        ...process.env,
        AAPESH_USER_DATA_DIR: dataDirectory,
        AAPESH_FRONTEND_DIST: frontendDirectory,
        AAPESH_BACKEND_PORT: String(port),
        DATABASE_URL: `sqlite:///${path.join(dataDirectory, 'aurora_music.db').replace(/\\/g, '/')}`,
        YTMUSIC_OAUTH_TOKEN_PATH: path.join(dataDirectory, 'oauth.json'),
        YTMUSIC_HEADERS_PATH: path.join(dataDirectory, 'browser.json'),
        APP_ENV: 'production',
        DEBUG: 'false',
        HOST: '127.0.0.1',
        PORT: String(port),
      };
      const executable = isPackaged
        ? path.join(process.resourcesPath, 'backend', 'AAPESHBackend.exe')
        : process.env.PYTHON || 'python';
      const args = isPackaged ? [] : ['-m', 'backend.desktop_server'];
      const logStream = getLogStream();
      const child = spawn(executable, args, {
        cwd: isPackaged ? dataDirectory : rootDirectory,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
      backendProcess = child;
      let readyStarted = false;
      let settled = false;
      let wasReady = false;
      let timer;
      const settleError = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        logStream.end();
        reject(error);
      };
      const stdout = createInterface({ input: child.stdout });
      const stderr = createInterface({ input: child.stderr });
      stdout.on('line', (line) => {
        logStream.write(`[stdout] ${line}\n`);
        const match = line.match(/^AAPESH_BACKEND_PORT=(\d+)$/);
        if (!match || readyStarted) return;
        readyStarted = true;
        const reportedPort = Number(match[1]);
        waitForHealth(reportedPort, child)
          .then(() => {
            if (settled) return;
            settled = true;
            wasReady = true;
            clearTimeout(timer);
            backendPort = reportedPort;
            savePort(reportedPort);
            logStream.write(`[desktop] backend ready on 127.0.0.1:${reportedPort}\n`);
            logStream.end();
            resolve(reportedPort);
          })
          .catch(settleError);
      });
      stderr.on('line', (line) => logStream.write(`[stderr] ${line}\n`));
      child.once('error', (error) => settleError(error));
      child.once('exit', (code) => {
        if (!settled) settleError(new Error(`Backend exited before readiness (code ${code}).`));
        if (backendProcess === child) {
          backendProcess = null;
          backendPort = null;
          if (!isShuttingDown && mainWindow && app.isReady() && wasReady) {
            showStartupError('The AAPESH service stopped unexpectedly.');
          }
        }
      });
      timer = setTimeout(
        () => settleError(new Error('The backend did not announce a listening port.')),
        32000,
      );
    });
  }

  async function startBackend() {
    if (backendStartPromise) return backendStartPromise;
    backendStartPromise = (async () => {
      if (backendProcess) {
        if (backendPort && (await requestHealth(backendPort))) return backendPort;
        const previousProcess = backendProcess;
        await stopChild(previousProcess, 1500);
        if (backendProcess === previousProcess) backendProcess = null;
        backendPort = null;
      }
      const savedPort = readSavedPort();
      const candidates = savedPort ? [savedPort, 0] : [0];
      let lastError;
      for (const candidate of candidates) {
        try {
          return await spawnBackend(candidate);
        } catch (error) {
          lastError = error;
          const failedChild = backendProcess;
          await stopChild(failedChild, 1000);
          if (backendProcess === failedChild) backendProcess = null;
          backendPort = null;
        }
      }
      throw lastError || new Error('Unable to start the AAPESH service.');
    })().finally(() => {
      backendStartPromise = null;
    });
    return backendStartPromise;
  }

  async function showStartupError(message) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      await mainWindow.loadFile(startupPage);
      mainWindow.webContents.send('desktop:startup-error', message);
    } catch {}
  }

  async function loadApplication() {
    const port = await startBackend();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
    if (smokeTest) {
      const resultPath = process.env.AAPESH_SMOKE_TEST_RESULT;
      const deadline = Date.now() + 15000;
      let rendererReady = false;
      while (Date.now() < deadline && mainWindow && !mainWindow.isDestroyed()) {
        rendererReady = await mainWindow.webContents
          .executeJavaScript(
            "document.title === 'AAPESH' && !!document.querySelector('#root')?.firstElementChild",
          )
          .catch(() => false);
        if (rendererReady) break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      if (resultPath) {
        fs.writeFileSync(
          resultPath,
          JSON.stringify({
            success: rendererReady,
            version: app.getVersion(),
            backendPort: port,
            userData: dataDirectory,
          }),
        );
      }
      app.quit();
    }
  }

  function createWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      return;
    }
    mainWindow = new BrowserWindow({
      title: 'AAPESH',
      width: 1440,
      height: 900,
      minWidth: 760,
      minHeight: 560,
      show: false,
      backgroundColor: '#050505',
      icon: isPackaged
        ? path.join(process.resourcesPath, 'assets', 'aapesh.ico')
        : path.join(rootDirectory, 'assets', 'aapesh.ico'),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        autoplayPolicy: 'no-user-gesture-required',
      },
    });
    mainWindow.once('ready-to-show', () => mainWindow?.show());
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      try {
        if (new URL(url).protocol === 'https:') void shell.openExternal(url);
      } catch {}
      return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
      const localOrigin = backendPort ? `http://127.0.0.1:${backendPort}` : null;
      if (localOrigin && url.startsWith(`${localOrigin}/`)) return;
      if (url === pathToFileURL(startupPage).href) return;
      event.preventDefault();
      try {
        if (new URL(url).protocol === 'https:') void shell.openExternal(url);
      } catch {}
    });
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    void mainWindow.loadFile(startupPage);
    void loadApplication().catch((error) => {
      const message = error instanceof Error ? error.message : 'The backend failed to start.';
      void showStartupError(message);
      if (smokeTest) {
        const resultPath = process.env.AAPESH_SMOKE_TEST_RESULT;
        if (resultPath) {
          fs.writeFileSync(
            resultPath,
            JSON.stringify({ success: false, error: message, userData: dataDirectory }),
          );
        }
        app.quit();
      }
    });
  }

  ipcMain.handle('desktop:retry-backend', async (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return false;
    try {
      await loadApplication();
      return true;
    } catch (error) {
      await showStartupError(error instanceof Error ? error.message : 'The backend failed to start.');
      return false;
    }
  });

  ipcMain.handle('desktop:quit', (event) => {
    if (mainWindow && event.sender === mainWindow.webContents) app.quit();
  });

  app.whenReady().then(createWindow);
  app.on('second-instance', () => mainWindow?.focus());
  app.on('activate', createWindow);
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', (event) => {
    if (allowQuit || !backendProcess) return;
    event.preventDefault();
    isShuttingDown = true;
    const child = backendProcess;
    void stopChild(child).finally(() => {
      allowQuit = true;
      backendProcess = null;
      app.quit();
    });
  });
}
