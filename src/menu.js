const { Menu } = require('electron')
const { shell } = require('electron')

module.exports = function menuBuilder(argvUrl, mainWindow) {
    const createDarkbotMenu = (label, qs) => ({
        label,
        click() {
            const url = `${argvUrl}/indexInternal.es?${qs}`
            mainWindow.loadURL(url)
        }
    })

    const template = [
        {
            label: 'Darkorbit',
            submenu: [
              createDarkbotMenu('Dock', 'action=internalDock'),
              createDarkbotMenu('Clan', 'action=internalNewClan'),
              createDarkbotMenu('Shop', 'action=internalDock&tpl=internalDockShips&checkOffer'),
              createDarkbotMenu('Skylab', 'action=internalSkylab'),
              createDarkbotMenu('Pilot Sheet', 'action=internalPilotSheet'),
              createDarkbotMenu('Auction', 'action=internalAuction'),
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

