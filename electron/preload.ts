import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  toggleExpand: () => ipcRenderer.invoke('toggle-expand'),
  getExpanded: () => ipcRenderer.invoke('get-expanded'),
  getUsageData: () => ipcRenderer.invoke('get-usage-data'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  // Fix #7: Use removeListener with specific reference instead of removeAllListeners
  onDataUpdate: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('usage-data-update', listener);
    return () => ipcRenderer.removeListener('usage-data-update', listener);
  },
});
