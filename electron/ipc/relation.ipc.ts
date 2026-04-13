import type { IpcMain } from 'electron'
import { IPC } from '../../shared/types'
import { relationService } from '../services/relation.service'

export function registerRelationIpc(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.RELATION_LIST,   (_, opts)       => relationService.list(opts))
  ipcMain.handle(IPC.RELATION_CREATE, (_, opts)       => relationService.create(opts))
  ipcMain.handle(IPC.RELATION_DELETE, (_, id: string) => relationService.delete(id))
}
