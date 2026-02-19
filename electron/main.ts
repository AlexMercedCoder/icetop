import { app, BrowserWindow, ipcMain, Menu } from 'electron';
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
    icon: path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? '../public/icon.png' : '../dist/icon.png'),
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
// Menu & About Window
// ============================================================

const createAboutWindow = () => {
  const aboutWin = new BrowserWindow({
    width: 450,
    height: 600,
    title: 'About IceTop',
    resizable: false,
    minimizable: false,
    maximizable: false,
    backgroundColor: '#0A1628',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Reuse main icon
    icon: path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? '../public/icon.png' : '../dist/icon.png'),
  });

  aboutWin.setMenuBarVisibility(false);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          background-color: #0A1628;
          color: #E2E8F0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          padding: 24px;
          font-size: 14px;
          line-height: 1.6;
          user-select: none;
          cursor: default;
        }
        h2 { margin-top: 0; margin-bottom: 8px; color: #fff; text-align: center; font-size: 20px; }
        .subtitle { text-align: center; color: #94a3b8; margin-bottom: 24px; }
        a { color: #38bdf8; text-decoration: none; cursor: pointer; }
        a:hover { text-decoration: underline; }
        ul { padding-left: 20px; color: #cbd5e1; margin-bottom: 24px; }
        li { margin-bottom: 8px; }
        .footer { margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 13px; color: #94a3b8; }
        .center { text-align: center; }
        .version { margin-top: 16px; color: #475569; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="center">
        <h2>IceTop</h2>
        <div class="subtitle">Created by <strong>Alex Merced</strong></div>
      </div>
      <p>Author of:</p>
      <ul>
        <li><a href="https://www.amazon.com/Apache-Iceberg-Definitive-Guide-Reliable/dp/1098148643" target="_blank">Apache Iceberg: The Definitive Guide</a></li>
        <li><a href="https://www.amazon.com/Apache-Polaris-Definitive-Guide-Catalog/dp/1098150001" target="_blank">Apache Polaris: The Definitive Guide</a></li>
        <li><a href="https://www.amazon.com/Architecting-Apache-Iceberg-Lakehouse-Performance/dp/1098157774" target="_blank">Architecting an Apache Iceberg Lakehouse</a></li>
        <li><a href="https://leanpub.com/iceberg-python" target="_blank">The Book on using Apache Iceberg with Python</a></li>
      </ul>
      <p>All of this and more can be found at <br/><a href="https://AlexMercedMedia.com" target="_blank">AlexMercedMedia.com</a>.</p>
      <div class="footer">
        <p>Alex Merced is the Head of DevRel for Dremio.</p>
        <p><a href="https://www.dremio.com/get-started/" target="_blank">Get a free trial at Dremio.com</a></p>
      </div>
      <div class="version">v${app.getVersion()}</div>
    </body>
    </html>
  `;

  aboutWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Handle external links
  aboutWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      require('electron').shell.openExternal(url);
    }
    return { action: 'deny' };
  });
};

const createMenu = () => {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only mostly)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: 'About IceTop', click: createAboutWindow },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    } as Electron.MenuItemConstructorOptions] : []),
    // File
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    // Edit
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'delete' as const },
        { role: 'selectAll' as const }
      ]
    },
    // View
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    // Window
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const }
        ] : [
          { role: 'close' as const }
        ])
      ]
    },
    // Help
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'About IceTop',
          click: createAboutWindow
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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
  createMenu();
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
