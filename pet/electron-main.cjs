const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 420,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'pet.html'));

  // Allow dragging anywhere on the window
  mainWindow.setIgnoreMouseEvents(false);

  // Right-click context menu
  mainWindow.webContents.on('context-menu', () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🐱 关于 Study Café 伴宠',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '📌 置顶窗口',
        type: 'checkbox',
        checked: mainWindow.isAlwaysOnTop(),
        click: () => {
          mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
        },
      },
      {
        label: '🔄 重置位置',
        click: () => {
          mainWindow.setPosition(100, 100);
        },
      },
      { type: 'separator' },
      {
        label: '❌ 关闭伴宠',
        click: () => {
          app.quit();
        },
      },
    ]);
    contextMenu.popup();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a simple 16x16 icon for the tray
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Study Café 伴宠');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示伴宠',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  // Tray is optional, some systems may not show empty icons well
  // createTray();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
