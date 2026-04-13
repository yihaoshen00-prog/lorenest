import type { IpcMain } from 'electron'
import { IPC } from '../../shared/types'
import { attachmentService } from '../services/attachment.service'

export function registerAttachmentIpc(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.ATTACHMENT_LIST, (_, nodeId: string) => {
    return attachmentService.list(nodeId)
  })

  ipcMain.handle(IPC.ATTACHMENT_ADD, (_, nodeId: string, sourcePath: string) => {
    return attachmentService.add(nodeId, sourcePath)
  })

  ipcMain.handle(IPC.ATTACHMENT_DELETE, (_, attachmentId: string) => {
    attachmentService.delete(attachmentId)
    return { deleted: true }
  })
}
