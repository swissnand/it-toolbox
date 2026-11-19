// SWISSNAND IT Toolbox — Electron-Hauptprozess
const { app, BrowserWindow, Menu, shell, nativeTheme } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'SWISSNAND IT Toolbox',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0e13' : '#f4f6f9',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Externe Links im Standardbrowser öffnen
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu', label: app.name }] : []),
    { role: 'editMenu', label: 'Bearbeiten' },
    {
      label: 'Ansicht',
      submenu: [
        { label: 'Tool suchen …', accelerator: 'CmdOrCtrl+K', click: () => win && win.webContents.executeJavaScript("window.dispatchEvent(new Event('tb:search'))") },
        { label: 'Übersicht', accelerator: 'CmdOrCtrl+0', click: () => win && win.webContents.executeJavaScript("location.hash='#/'") },
        { type: 'separator' },
        { role: 'reload', label: 'Neu laden' },
        { role: 'toggleDevTools', label: 'Entwicklertools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Originalgrösse' },
        { role: 'zoomIn', label: 'Vergrössern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
      ],
    },
    { role: 'windowMenu', label: 'Fenster' },
    {
      role: 'help',
      label: 'Hilfe',
      submenu: [
        { label: 'Website swissnand.com', click: () => shell.openExternal('https://swissnand.com') },
        { label: 'Projekt auf GitHub', click: () => shell.openExternal('https://github.com/swissnand/it-toolbox') },
        { label: 'Fehler melden', click: () => shell.openExternal('https://github.com/swissnand/it-toolbox/issues') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
