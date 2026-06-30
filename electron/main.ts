import { app, BrowserWindow, dialog, shell } from 'electron'
import electronUpdater from 'electron-updater'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { autoUpdater } = electronUpdater

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
const ELECTRON_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#07080d',
    autoHideMenuBar: true,
    title: 'Easy Piano',
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: path.join(ELECTRON_DIST, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    void win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    void win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function setupAutoUpdater() {
  if (VITE_DEV_SERVER_URL) return // skip in dev

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => console.log('[updater] checking…'))
  autoUpdater.on('update-not-available', () => console.log('[updater] none'))
  autoUpdater.on('error', (err) => console.error('[updater] error:', err))
  autoUpdater.on('download-progress', (p) => {
    win?.setProgressBar(p.percent / 100)
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] available:', info.version)
  })

  autoUpdater.on('update-downloaded', async (info) => {
    win?.setProgressBar(-1)
    console.log('[updater] downloaded:', info.version)

    const result = await dialog.showMessageBox(win!, {
      type: 'info',
      title: 'Update ready',
      message: `Easy Piano ${info.version} is downloaded`,
      detail: 'Restart the app to install the update. You can also install it later when you quit.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })

    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('[updater] check failed:', err)
  })
}

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})
