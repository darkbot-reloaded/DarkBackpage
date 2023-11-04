const { Menu } = require('electron')
const { shell } = require('electron')

module.exports = function menuBuilder(url, mainWindow) {
    const template = [
        {
            label: 'Darkorbit',
            submenu: [
                {
                    label: "Dock",
                    click: () => mainWindow.loadUrl(`${url}/indexInternal.es?action=internalDock`)
                },
                {
                    label: "Clan",
                    click: () => mainWindow.loadUrl(`${url}/indexInternal.es?action=internalNewClan`)
                },
                {
                    label: "Shop",
                    click: () => mainWindow.loadUrl(`${url}/indexInternal.es?action=internalDock&tpl=internalDockShips&checkOffer`)
                },
                {
                    label: "Skylab",
                    click: () => mainWindow.loadUrl(`${url}/indexInternal.es?action=internalSkylab`)
                },
                {
                    label: "Pilot Sheet",
                    click: () => mainWindow.loadUrl(`${url}/indexInternal.es?action=internalPilotSheet`)
                },
                {
                    label: "Auction",
                    click: () => mainWindow.loadUrl(`${url}/indexInternal.es?action=internalAuction`)
                }
            ]
        },
        { role: 'fileMenu' },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
        {
            role: 'help',
            submenu: [
              {
                label: 'Learn More',
                click: async () => {
                  await shell.openExternal('https://darkbot.eu/')
                }
              },
            ]
          }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

