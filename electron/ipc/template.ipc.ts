import type { IpcMain } from 'electron'
import { templateService } from '../services/template.service'
import { IPC } from '../../shared/types'

export function registerTemplateIpc(ipcMain: IpcMain) {
  ipcMain.handle(IPC.TEMPLATE_LIST,       (_, entityType) => templateService.list(entityType))
  ipcMain.handle(IPC.TEMPLATE_GET,        (_, id)         => templateService.get(id))
  ipcMain.handle(IPC.TEMPLATE_GET_BY_TYPE,(_, entityType) => templateService.getByType(entityType))
  ipcMain.handle(IPC.TEMPLATE_CREATE,     (_, opts)       => templateService.create(opts))
  ipcMain.handle(IPC.TEMPLATE_UPDATE,     (_, id, patch)  => templateService.update(id, patch))
  ipcMain.handle(IPC.TEMPLATE_DELETE,     (_, id)         => templateService.delete(id))
}
