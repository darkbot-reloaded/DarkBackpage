const {app, BrowserWindow} = require('electron')
const path = require('path')

app.commandLine.appendSwitch('ppapi-flash-path', path.join(process.resourcesPath, 'res', 'pepflashplayer.dll'))

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        autoHideMenuBar: true,
        title: "Dark Backpage",
        webPreferences: {
            plugins: true,
            sandbox: false,
            // nodeIntegration: true,
            // contextIsolation: false,
            // enableRemoteModule: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.webContents.userAgent = 'BigpointClient/1.6.7'
    mainWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault()
        mainWindow.loadURL(url)
    })

    mainWindow.on('page-title-updated', (evt) => {
        evt.preventDefault();
    });

    const {url, sid} = parseArgv();
    if (url && sid) {
        mainWindow.webContents.session.cookies.set({url: url, name: 'dosid', value: sid})
            .then(r => mainWindow.loadURL(url + '/indexInternal.es?action=internalStart'))
    } else {
        mainWindow.loadURL('https://darkorbit.com')
        //mainWindow.loadFile(path.join(__dirname, 'index.html'))
    }
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})//
function parseArgv() {
    let url, sid
    for (let i = 0; i < process.argv.length && !(url && sid); i++) {
        switch (process.argv[i]) {
            case '--url':
                url = process.argv[++i]
                break
            case '--sid':
                sid = process.argv[++i]
        }
    }
    return {url, sid};
}