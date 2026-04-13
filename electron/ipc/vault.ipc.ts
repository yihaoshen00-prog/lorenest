import type { IpcMain } from 'electron'
import { IPC } from '../../shared/types'
import { vaultService } from '../services/vault.service'

export function registerVaultIpc(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.VAULT_LIST,  () => vaultService.list())
  ipcMain.handle(IPC.VAULT_GET_CURRENT, () => vaultService.list()[0] ?? null)
  ipcMain.handle(IPC.VAULT_CREATE, (_, opts) => vaultService.create(opts))
  ipcMain.handle(IPC.VAULT_OPEN,   (_, id: string) => vaultService.getById(id))
  ipcMain.handle(IPC.VAULT_DELETE, (_, id: string) => vaultService.delete(id))
}
