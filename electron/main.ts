import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { DbService } from './services/db.service'
import { registerVaultIpc }  from './ipc/vault.ipc'
import { registerNodeIpc }   from './ipc/node.ipc'
import { registerFolderIpc } from './ipc/folder.ipc'
import { registerImportIpc } from './ipc/import.ipc'
import { registerBackupIpc } from './ipc/backup.ipc'
import { registerDialogIpc }   from './ipc/dialog.ipc'
import { registerTemplateIpc }    from './ipc/template.ipc'
import { registerAttachmentIpc } from './ipc/attachment.ipc'
import { registerRelationIpc }   from './ipc/relation.ipc'
import { registerExportIpc }     from './ipc/export.ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0d0f1a',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow!.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.lorenest')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 异步初始化数据库（sql.js 需要加载 WASM）
  await DbService.getInstance().initialize()

  // 注册所有 IPC 处理器
  registerVaultIpc(ipcMain)
  registerNodeIpc(ipcMain)
  registerFolderIpc(ipcMain)
  registerImportIpc(ipcMain, () => mainWindow)
  registerBackupIpc(ipcMain)
  registerDialogIpc(ipcMain)
  registerTemplateIpc(ipcMain)
  registerAttachmentIpc(ipcMain)
  registerRelationIpc(ipcMain)
  registerExportIpc(ipcMain)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    DbService.getInstance().close()
    app.quit()
  }
})
