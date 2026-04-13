import type { IpcMain } from 'electron'
import { IPC } from '../../shared/types'
import { nodeService } from '../services/node.service'

export function registerNodeIpc(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.NODE_LIST,   (_, opts)       => nodeService.list(opts))
  ipcMain.handle(IPC.NODE_GET,    (_, id: string) => nodeService.get(id))
  ipcMain.handle(IPC.NODE_CREATE, (_, opts)       => nodeService.create(opts))
  ipcMain.handle(IPC.NODE_UPDATE, (_, id: string, patch) => nodeService.update(id, patch))
  ipcMain.handle(IPC.NODE_DELETE, (_, id: string) => nodeService.softDelete(id))
  ipcMain.handle(IPC.NODE_RESTORE,(_, id: string) => nodeService.restore(id))
  ipcMain.handle(IPC.NODE_SEARCH, (_, query: string, opts) => nodeService.search(query, opts))
  ipcMain.handle(IPC.NODE_GET_BACKLINKS, (_, id: string) => nodeService.getBacklinks(id))
}
