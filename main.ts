import { app, BrowserWindow, screen, Menu, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { autoUpdater } from 'electron-updater'
let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

// require('update-electron-app')()
autoUpdater.checkForUpdatesAndNotify()
function buildMenu(): MenuItemConstructorOptions[] {
    const template: MenuItemConstructorOptions[] = [
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { role: 'toggledevtools' },
            { type: 'separator' },
            { role: 'resetzoom' },
            { role: 'zoomin' },
            { role: 'zoomout' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    {
        role: 'window',
        submenu: [
            { role: 'minimize' },
            { role: 'close' }
        ]
    },
    {
        role: 'help',
        submenu: [
        {
            label: 'Learn More',
            click () { require('electron').shell.openExternal('https://electronjs.org') }
        }
        ]
    }
    ]

    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        })

        // Window menu
        template[3].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ]
    }
    return template
}
function createWindow() {
    const electronScreen = screen;
    const size = electronScreen.getPrimaryDisplay().workAreaSize;

    // Create the browser window.
    win = new BrowserWindow({
        width: 1024,
        height: 600,
        webPreferences: { webSecurity: false },
        icon: __dirname + '/etcd_GoL_1.ico'
    });
    win.setOverlayIcon(__dirname + '/etcd.png', 'logo');

    const menu = Menu.buildFromTemplate(buildMenu())
    Menu.setApplicationMenu(menu)

    // win.setMenu(null);
    console.log('load with serve', serve)
    if (serve) {

        require('electron-reload')(__dirname, {
            // electron: require('electron-prebuilt'),
            electron: require(__dirname + '/node_modules/electron')
        });
        win.loadURL('http://localhost:14202');
    } else {
        win.loadURL(url.format({
            pathname: path.join(__dirname, 'dist/index.html'),
            protocol: 'file:',
            slashes: true
        }));
    }

    win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });

}

try {

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', createWindow);

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow();
        }
    });

} catch (e) {
    // Catch Error
    // throw e;
}
