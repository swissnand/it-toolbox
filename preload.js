// Bewusst minimal: Die Oberfläche braucht keinen Zugriff auf Node.js.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('toolbox', {
  platform: process.platform,
  isApp: true,
});
