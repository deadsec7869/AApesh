const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aapeshDesktop', {
  retryBackend: () => ipcRenderer.invoke('desktop:retry-backend'),
  quit: () => ipcRenderer.invoke('desktop:quit'),
  onStartupError: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, message) => callback(String(message).slice(0, 500));
    ipcRenderer.on('desktop:startup-error', listener);
    return () => ipcRenderer.removeListener('desktop:startup-error', listener);
  },
});
