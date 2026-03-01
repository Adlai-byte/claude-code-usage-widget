import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  toggleExpand: () => ipcRenderer.invoke('toggle-expand'),
  getExpanded: () => ipcRenderer.invoke('get-expanded'),
  getUsageData: () => ipcRenderer.invoke('get-usage-data'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  onDataUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('usage-data-update', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('usage-data-update');
  },
});
