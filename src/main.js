const {app, BrowserWindow} = require('electron')
const path = require('path')

app.commandLine.appendSwitch('ppapi-flash-path', getFlashPath())

let mainWindow

function createWindow() {
    let icon;
    if (process.platform === "linux") {
        icon = path.join(process.resourcesPath, "res", "icon.png")
    }

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        darkTheme: true,
        icon: icon,
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
        console.log("path: " + getFlashPath())
        evt.preventDefault();
    });

    const {url, sid} = parseArgv();
    if (url && sid) {
        mainWindow.webContents.session.cookies.set({url: url, name: 'dosid', value: sid})
            .then(() => mainWindow.loadURL(url + '/indexInternal.es?action=internalStart'))
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
})

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

function getFlashPath() {
    switch (process.platform) {
        case "darwin":
            return path.join(process.resourcesPath, 'res', 'flash.plugin')
        case "linux":
            app.commandLine.appendSwitch("--no-sandbox")
            return path.join(process.resourcesPath, 'res', 'libpepflashplayer.so')
        case "win32":
            return path.join(process.resourcesPath, 'res', 'pepflashplayer.dll')
    }
    return ""
}