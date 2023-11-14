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
    const {url, sid, captcha, timeout} = parseArgv();
    let resolveCaptcha = url != null && !sid && captcha != null;

    mainWindow = new BrowserWindow({
        backgroundColor: "#161616",
        width: resolveCaptcha ? 320 : 1400,
        height: resolveCaptcha ? 95 : 900,
        frame: !resolveCaptcha,
        autoHideMenuBar: resolveCaptcha,
        alwaysOnTop: resolveCaptcha,
        icon: icon,
        show: false,
        darkTheme: true,
        title: "Dark Backpage",
        webPreferences: {
            allowRunningInsecureContent: false,
            plugins: true,
            sandbox: false,
            nodeIntegration: resolveCaptcha,
            enableRemoteModule: resolveCaptcha,
            preload: path.join(__dirname, "preload.js")
        }
    })

    if (timeout > 0) {
        setTimeout(function () {
            app.quit();
        }, timeout)
    }

    if (resolveCaptcha) {
        global.captchaResult = function(result){
            process.stdout.write("[captchaResult]" + result)
            process.stdout.write("\n")
        }

        global.captchaFailed = function(){
            process.stdout.write("[captchaError]")
            process.stdout.write("\n")
        }

        global.onOpen = function(){
            mainWindow.setSize(400, 600)
            mainWindow.center()
        }
    }

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
            if (url && sid) {
                mainWindow.webContents.session.cookies.set({url: url, name: "dosid", value: sid})
                    .then(() => mainWindow.loadURL(url + "/indexInternal.es?action=internalDock"))
            } else if (resolveCaptcha) {
                try {
                    mainWindow.webContents.debugger.attach('1.1')
                } catch (err) {
                    console.log('Debugger attach failed : ', err)
                }

                mainWindow.webContents.debugger.on('message', (event, method, params) => {
                    if (method === "Fetch.requestPaused") {
                        mainWindow.webContents.debugger.sendCommand("Fetch.fulfillRequest", {
                            requestId: params.requestId,
                            responseCode: 200,
                            body: getCaptchaSiteBody(captcha)
                        }).then(() => {
                            mainWindow.webContents.debugger.detach();
                        })
                    }
                })

                mainWindow.webContents.debugger.sendCommand("Fetch.enable", {patterns: [{urlPattern: "*", requestStage: "Response"}]});
                mainWindow.loadURL(url)
            } else {
                mainWindow.loadURL(url == null ? "https://www.darkorbit.com" : url)
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
    let url = null, sid = null, captcha = null, timeout = -1;
    for (let i = 0; i < process.argv.length && !(url && sid); i++) {
        switch (process.argv[i]) {
            case "--url":
                url = process.argv[++i]
                break
            case "--sid":
                sid = process.argv[++i]
                break
            case "--captcha":
                captcha = process.argv[++i];
                break
            case "--exit":
                timeout = Number(process.argv[++i])
        }
    }
    return {url, sid, captcha, timeout};
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

function getCaptchaSiteBody(captchaSiteKey) {
    let body = `<html>
<head>
    <script src="https://js.hcaptcha.com/1/api.js?onload=onLoad" async defer></script>
</head>
<body>
<script type="text/javascript">
    function onResult(result) {
        let {remote} = require('electron');
        remote.getGlobal("captchaResult")(result)
    }
    
    function onError() {
        let {remote} = require('electron');
        remote.getGlobal("captchaFailed")()
    }
    
    function onOpen() {
        let {remote} = require('electron');
        remote.getGlobal("onOpen")()
    }
</script>

<div class="h-captcha"
     data-theme="dark"
     data-sitekey="%SITE_KEY%"
     data-callback="onResult"
     data-error-callback="onError"
     data-open-callback="onOpen"
     ></div>
</body>
</html>`

    return Buffer.from(body.replace("%SITE_KEY%", captchaSiteKey)).toString("base64");
}