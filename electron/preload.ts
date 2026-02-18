import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('icetop', {
  catalog: {
    listCatalogs: () => ipcRenderer.invoke('catalog:listCatalogs'),
    listNamespaces: (catalog: string) => ipcRenderer.invoke('catalog:listNamespaces', catalog),
    listTables: (catalog: string, namespace: string) =>
      ipcRenderer.invoke('catalog:listTables', catalog, namespace),
    listChildren: (catalog: string, namespace: string) =>
      ipcRenderer.invoke('catalog:listChildren', catalog, namespace),
    describeTable: (catalog: string, table: string) =>
      ipcRenderer.invoke('catalog:describeTable', catalog, table),
    getSnapshots: (catalog: string, table: string) =>
      ipcRenderer.invoke('catalog:getSnapshots', catalog, table),
  },
  sql: {
    execute: (catalog: string, query: string) =>
      ipcRenderer.invoke('sql:execute', catalog, query),
    getHistory: () => ipcRenderer.invoke('sql:getHistory'),
  },
  chat: {
    send: (catalog: string, message: string, sessionId: string) =>
      ipcRenderer.invoke('chat:send', catalog, message, sessionId),
    reset: (sessionId?: string) => ipcRenderer.invoke('chat:reset', sessionId),
    reload: () => ipcRenderer.invoke('chat:reload'),
    onProgress: (callback: (params: any) => void) => {
      const handler = (_event: any, params: any) => callback(params);
      ipcRenderer.on('chat:progress', handler);
      return () => ipcRenderer.removeListener('chat:progress', handler);
    },
  },
  notebook: {
    executeCell: (catalog: string, code: string) =>
      ipcRenderer.invoke('notebook:executeCell', catalog, code),
    listPackages: () => ipcRenderer.invoke('notebook:listPackages'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  },
});
