const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 200,
    height: 240,
    x: 80,
    y: 80,
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
  mainWindow.setIgnoreMouseEvents(false);

  // Right-click context menu
  mainWindow.webContents.on('context-menu', () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: '🐱 Study Café 伴宠', enabled: false },
      { type: 'separator' },
      {
        label: '📌 置顶窗口',
        type: 'checkbox',
        checked: mainWindow.isAlwaysOnTop(),
        click: () => mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop()),
      },
      {
        label: '🔄 重置位置',
        click: () => mainWindow.setPosition(80, 80),
      },
      { type: 'separator' },
      { label: '❌ 关闭', click: () => app.quit() },
    ]);
    contextMenu.popup();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (!mainWindow) createWindow(); });
