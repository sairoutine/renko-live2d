// electron エントリポイント
'use strict';
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;

function createWindow () {
	mainWindow = new BrowserWindow({
	  width: 532, 
	  height: 532,
	  "transparent": true,    // ウィンドウの背景を透過
	  "frame": false,     // 枠の無いウィンドウ
	  "resizable": false,  // ウィンドウのリサイズを禁止
	  "hasShadow": false,
	  alwaysOnTop: true,
	});
	mainWindow.loadURL(`file://${__dirname}/index.html`);

	// Open the DevTools.
	//mainWindow.webContents.openDevTools()

	mainWindow.on('closed', function () {
		mainWindow = null;
	});
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow();
	}
});
