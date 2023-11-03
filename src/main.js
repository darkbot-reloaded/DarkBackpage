const {app, BrowserWindow} = require("electron")
const path = require("path")
const contextMenu = require("electron-context-menu");

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
app.commandLine.appendSwitch("ppapi-flash-path", getFlashPath())

let mainWindow

function createWindow() {
    let icon;
    if (process.platform === "linux") {
        icon = path.join(process.resourcesPath, "res", "icon.png")
    }

    mainWindow = new BrowserWindow({
        backgroundColor: "#161616",
        width: 1400,
        height: 900,
        icon: icon,
        show: false,
        darkTheme: true,
        title: "Dark Backpage",
        webPreferences: {
            allowRunningInsecureContent: false,
            plugins: true,
            sandbox: false,
            // nodeIntegration: true,
            // contextIsolation: false,
            // enableRemoteModule: true,
            preload: path.join(__dirname, "preload.js")
        }
    })

    contextMenu({
        menu: (actions, props, browserWindow, dictionarySuggestions) => [
            {
                label: "Forward",
                click: () => mainWindow.webContents.goForward(),
                visible: mainWindow.webContents.canGoForward()
            },
            {
                label: "Backward",
                click: () => mainWindow.webContents.goBack(),
                visible: mainWindow.webContents.canGoBack()
            },
            actions.separator(),
            {
                role: "reload"
            },
            {
                role: "toggleDevTools"
            },
            actions.inspect(),
            actions.services(),
        ]
    })

    mainWindow.webContents.userAgent = "BigpointClient/1.6.9"
    mainWindow.webContents.on("new-window", (event, url) => {
        event.preventDefault()
        mainWindow.loadURL(url)
    })

    mainWindow.webContents.session.webRequest.onBeforeRequest(
        (details, callback) => {
            let cancel = details.url.indexOf("quant") !== -1 || details.url.indexOf("googletag") !== -1
            callback({cancel: cancel})
        })

    mainWindow.on("page-title-updated", (evt) => {
        evt.preventDefault();
    });

    mainWindow.loadURL("data:text/html;charset=UTF-8," + encodeURIComponent("<html></html>"))
        .then(r => {
            const {url, sid} = parseArgv();
            if (url && sid) {
                mainWindow.webContents.session.cookies.set({url: url, name: "dosid", value: sid})
                    .then(() => mainWindow.loadURL(url + "/indexInternal.es?action=internalDock"))
            } else {
                mainWindow.loadURL("https://darkorbit.com")
                //mainWindow.loadFile(path.join(__dirname, "index.html"))
            }
            mainWindow.show();
        });
}

app.whenReady().then(() => {
    createWindow()

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit()
})

function parseArgv() {
    let url, sid
    for (let i = 0; i < process.argv.length && !(url && sid); i++) {
        switch (process.argv[i]) {
            case "--url":
                url = process.argv[++i]
                break
            case "--sid":
                sid = process.argv[++i]
        }
    }
    return {url, sid};
}

function getFlashPath() {
    switch (process.platform) {
        case "darwin":
            return path.join(process.resourcesPath, "res", "flash.plugin")
        case "linux":
            app.commandLine.appendSwitch("--no-sandbox")
            return path.join(process.resourcesPath, "res", "libpepflashplayer.so")
        case "win32":
            return path.join(process.resourcesPath, "res", "pepflashplayer.dll")
    }
    return ""
}