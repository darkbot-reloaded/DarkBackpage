const {app, BrowserWindow} = require("electron")
const path = require("path")
const contextMenu = require("electron-context-menu");

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
app.commandLine.appendSwitch("ppapi-flash-path", getFlashPath())

const menuBuilder = require('./menu')

let mainWindow

function createWindow() {
    let icon;
    if (process.platform === "linux") {
        icon = path.join(process.resourcesPath, "res", "icon.png")
    }
    const {url, sid, captcha, timeout, fullUrl, lang} = parseArgv();
    let resolveCaptcha = url != null && !sid && captcha != null;

    mainWindow = new BrowserWindow({
        backgroundColor: "#161616",
        width: resolveCaptcha ? 320 : 1400,
        height: resolveCaptcha ? (timeout > 0 ? 115 : 95) : 900,
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
	
	const languages = [
		["Bulgarian", "bg"],
		["Czech", "cs"],
		["German", "de"],
		["Greek", "el"],
		["English", "en"],
		["Spanish", "es"],
		["French", "fr"],
		["Hungarian", "hu"],
		["Italian", "it"],
		["Lithuanian", "lt"],
		["Polish", "pl"],
		["Portuguese", "pt"],
		["Romanian", "ro"],
		["Russian", "ru"],
		["Swedish", "sv"],
		["Turkish", "tr"],
		["Ukrainian", "uk"]
	];

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
            actions.separator(),
			{
				label: "Change Language",
				submenu: languages.map(([languageName, languageCode]) => ({
					label: languageName,
					click: () => reloadWithLanguage(languageCode)
				}))
			}
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
            if ((url || fullUrl) && sid) {
                const finalUrl = generateLangUrl(fullUrl ? fullUrl : (url + "/indexInternal.es?action=internalDock"), lang)
                mainWindow.webContents.session.cookies.set({url: url, name: "dosid", value: sid})
                    .then(() => mainWindow.loadURL(finalUrl))
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
                            body: getCaptchaSiteBody(captcha, timeout || 60)
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

            menuBuilder(url || "https://darkorbit.com", mainWindow)
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
    let url = null, sid = null, captcha = null, timeout = -1, fullUrl = null, lang = null;
    for (let i = 0; i < process.argv.length; i++) {
        let temp = null;
        if ((temp = parse("--url", i)) != null)
            url = temp;
        else if ((temp = parse("--fullurl", i)) != null)
            fullUrl = temp;
        else if ((temp = parse("--sid", i)) != null)
            sid = temp;
        else if ((temp = parse("--captcha", i)) != null)
            captcha = temp;
        else if ((temp = parse("--exit", i)) != null)
            timeout = Number(temp)
        else if ((temp = parse("--lang", i)) != null)
            lang = temp
    }
    return {url, sid, captcha, timeout, fullUrl, lang};
}

function parse(name, idx) {
    if (process.argv[idx] === name)
        return process.argv[idx + 1];
    if (process.argv[idx].includes(name)) {
        return process.argv[idx].substring(name.length + 1)
    }

    return null;
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

function reloadWithLanguage(lang) {
    mainWindow.loadURL(generateLangUrl(mainWindow.webContents.getURL(), lang));
}

function generateLangUrl(url, lang) {
    // Parse existing parameters
    const urlObject = new URL(url);
    const params = urlObject.searchParams;

    // Check if lang parameter is set
    if (lang) {
        // Remove existing lang parameter
        params.delete('lang');
        
        // Add the lang parameter
        params.append('lang', lang);
        
        // Reconstruct the URL with updated parameters
        urlObject.search = params.toString();
    }

    return urlObject.toString();
}


function getCaptchaSiteBody(captchaSiteKey, timeout) {
    let body = `<html>
<head>
    <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
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

%PROGRESS_BAR%

<div class="h-captcha"
     data-theme="dark"
     data-sitekey="%SITE_KEY%"
     data-callback="onResult"
     data-error-callback="onError"
     data-open-callback="onOpen"
     ></div>
</body>
</html>`

    let progressBar = `
<progress value="COUNTDOWN" max="COUNTDOWN" id="progressBar"></progress>
<script type="application/javascript">
    let progressBar = document.getElementById("progressBar")
    progressBar.style.width = "300px";

    let startDate = new Date();
    let progressTimer = setInterval(function () {
        let usedTime = (new Date() - startDate);
        progressBar.value = COUNTDOWN - usedTime;

        if (COUNTDOWN - usedTime <= 0) {
            clearInterval(progressTimer);
        }
    }, 15);
</script>`

    if (timeout > 0) {
        body = body.replace("%PROGRESS_BAR%", progressBar.replaceAll("COUNTDOWN", timeout))
    } else body = body.replace("%PROGRESS_BAR%", "")

    return Buffer.from(body.replace("%SITE_KEY%", captchaSiteKey)).toString("base64");
}