import type { IpcMain } from 'electron'
import { dialog, BrowserWindow } from 'electron'
import { IPC } from '../../shared/types'

export function registerDialogIpc(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.DIALOG_OPEN_DIR, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.DIALOG_OPEN_FILE, async (_, opts?: { filters?: Electron.FileFilter[] }) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: opts?.filters,
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.DIALOG_SAVE_FILE, async (_, opts?: { defaultPath?: string; filters?: Electron.FileFilter[] }) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: opts?.defaultPath,
      filters: opts?.filters,
    })
    return result.canceled ? null : result.filePath
  })
}
