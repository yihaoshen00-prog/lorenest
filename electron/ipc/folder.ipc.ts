import type { IpcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { IPC } from '../../shared/types'
import { DbService } from '../services/db.service'
import type { FolderNode } from '../../shared/types'

function rowToFolder(row: any): FolderNode {
  return {
    id:         row.id,
    vaultId:    row.vault_id,
    name:       row.name,
    path:       row.path,
    parentId:   row.parent_id ?? undefined,
    sourcePath: row.source_path ?? undefined,
    createdAt:  row.created_at,
  }
}

export function registerFolderIpc(ipcMain: IpcMain): void {
  const db = () => DbService.getInstance()

  ipcMain.handle(IPC.FOLDER_LIST, (_, vaultId: string) => {
    return db().all<any>('SELECT * FROM folder_nodes WHERE vault_id = ? ORDER BY path', [vaultId])
      .map(rowToFolder)
  })

  ipcMain.handle(IPC.FOLDER_CREATE, (_, opts: { vaultId: string; name: string; path: string; parentId?: string }) => {
    const id  = uuidv4()
    const now = new Date().toISOString()
    db().run(
      'INSERT INTO folder_nodes (id, vault_id, name, path, parent_id, created_at) VALUES (?,?,?,?,?,?)',
      [id, opts.vaultId, opts.name, opts.path, opts.parentId ?? null, now]
    )
    return rowToFolder(db().get<any>('SELECT * FROM folder_nodes WHERE id = ?', [id])!)
  })

  ipcMain.handle(IPC.FOLDER_RENAME, (_, id: string, name: string) => {
    db().run('UPDATE folder_nodes SET name = ? WHERE id = ?', [name, id])
  })

  ipcMain.handle(IPC.FOLDER_DELETE, (_, id: string) => {
    db().run('DELETE FROM folder_nodes WHERE id = ?', [id])
  })
}
