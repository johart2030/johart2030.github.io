const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopShell', {
  navigate: url => ipcRenderer.send('hst-shell:navigate', url),
  onState: callback => ipcRenderer.on('hst-shell:state', (_event, state) => callback(state))
});
