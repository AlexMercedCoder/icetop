import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { PythonManager } from './python/manager';

let mainWindow: BrowserWindow | null = null;
let pythonManager: PythonManager | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'IceTop',
    backgroundColor: '#0A1628',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the Vite dev server in development, or the built file in production
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// ============================================================
// IPC Handlers — Bridge to Python backend
// ============================================================

const setupIPC = () => {
  // Catalog operations
  ipcMain.handle('catalog:listCatalogs', async () => {
    return pythonManager?.sendRequest('list_catalogs', {});
  });

  ipcMain.handle('catalog:listNamespaces', async (_event, catalog: string) => {
    return pythonManager?.sendRequest('list_namespaces', { catalog });
  });

  ipcMain.handle('catalog:listTables', async (_event, catalog: string, namespace: string) => {
    return pythonManager?.sendRequest('list_tables', { catalog, namespace });
  });

  ipcMain.handle('catalog:listChildren', async (_event, catalog: string, namespace: string) => {
    return pythonManager?.sendRequest('list_children', { catalog, namespace });
  });

  ipcMain.handle('catalog:describeTable', async (_event, catalog: string, table: string) => {
    return pythonManager?.sendRequest('describe_table', { catalog, table });
  });

  ipcMain.handle('catalog:getSnapshots', async (_event, catalog: string, table: string) => {
    return pythonManager?.sendRequest('get_snapshots', { catalog, table });
  });

  // SQL operations
  ipcMain.handle('sql:execute', async (_event, catalog: string, query: string) => {
    return pythonManager?.sendRequest('execute_sql', { catalog, query });
  });

  ipcMain.handle('sql:getHistory', async () => {
    return pythonManager?.sendRequest('get_query_history', {});
  });

  // Chat operations
  ipcMain.handle('chat:send', async (_event, catalog: string, message: string, sessionId: string) => {
    return pythonManager?.sendRequest('chat', { catalog, message, sessionId });
  });

  ipcMain.handle('chat:reset', async (_event, sessionId?: string) => {
    return pythonManager?.sendRequest('chat_reset', { sessionId });
  });

  ipcMain.handle('chat:reload', async () => {
    return pythonManager?.sendRequest('chat_reload', {});
  });

  // Notebook operations
  ipcMain.handle('notebook:executeCell', async (_event, catalog: string, code: string) => {
    return pythonManager?.sendRequest('execute_cell', { catalog, code });
  });

  ipcMain.handle('notebook:listPackages', async () => {
    return pythonManager?.sendRequest('list_packages', {});
  });

  // Settings operations
  ipcMain.handle('settings:get', async () => {
    return pythonManager?.sendRequest('get_settings', {});
  });

  ipcMain.handle('settings:update', async (_event, settings: any) => {
    const result = await pythonManager?.sendRequest('update_settings', { settings });
    // Hot-reload chat agents so new AI credentials take effect immediately
    await pythonManager?.sendRequest('chat_reload', {}).catch(() => {});
    return result;
  });
};

// ============================================================
// App Lifecycle
// ============================================================

app.whenReady().then(async () => {
  // Start Python backend
  pythonManager = new PythonManager();
  await pythonManager.start();

  // Forward Python notifications to renderer
  pythonManager.onNotification((notification, params) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(notification, params);
    }
  });

  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  pythonManager?.stop();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  pythonManager?.stop();
});
