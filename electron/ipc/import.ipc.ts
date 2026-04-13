import type { IpcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/types'
import { importService } from '../services/import.service'

export function registerImportIpc(ipcMain: IpcMain, getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.IMPORT_PREVIEW, (_, sourceRoot: string) => {
    return importService.preview(sourceRoot)
  })

  ipcMain.handle(IPC.IMPORT_START, async (_, opts) => {
    const win = getWindow()

    const result = await importService.start({
      ...opts,
      onProgress: (data) => {
        win?.webContents.send(IPC.IMPORT_PROGRESS, data)
      },
    })

    win?.webContents.send(IPC.IMPORT_COMPLETE, result)
    return result
  })
}
