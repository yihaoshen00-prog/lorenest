import { contextBridge, ipcRenderer, shell } from 'electron'
import { IPC } from '../shared/types'

// 暴露给渲染进程的安全 API
const api = {
  // ── Vault ────────────────────────────────────────────────
  vault: {
    list:       ()            => ipcRenderer.invoke(IPC.VAULT_LIST),
    create:     (opts: unknown) => ipcRenderer.invoke(IPC.VAULT_CREATE, opts),
    open:       (id: string)  => ipcRenderer.invoke(IPC.VAULT_OPEN, id),
    delete:     (id: string)  => ipcRenderer.invoke(IPC.VAULT_DELETE, id),
    getCurrent: ()            => ipcRenderer.invoke(IPC.VAULT_GET_CURRENT),
  },

  // ── Folder ───────────────────────────────────────────────
  folder: {
    list:   (vaultId: string) => ipcRenderer.invoke(IPC.FOLDER_LIST, vaultId),
    create: (opts: unknown)   => ipcRenderer.invoke(IPC.FOLDER_CREATE, opts),
    rename: (id: string, name: string) => ipcRenderer.invoke(IPC.FOLDER_RENAME, id, name),
    delete: (id: string)      => ipcRenderer.invoke(IPC.FOLDER_DELETE, id),
  },

  // ── Node (Document + Entity) ─────────────────────────────
  node: {
    list:         (opts: unknown)         => ipcRenderer.invoke(IPC.NODE_LIST, opts),
    get:          (id: string)            => ipcRenderer.invoke(IPC.NODE_GET, id),
    create:       (opts: unknown)         => ipcRenderer.invoke(IPC.NODE_CREATE, opts),
    update:       (id: string, patch: unknown) => ipcRenderer.invoke(IPC.NODE_UPDATE, id, patch),
    delete:       (id: string)            => ipcRenderer.invoke(IPC.NODE_DELETE, id),
    restore:      (id: string)            => ipcRenderer.invoke(IPC.NODE_RESTORE, id),
    search:       (query: string, opts?: unknown) => ipcRenderer.invoke(IPC.NODE_SEARCH, query, opts),
    getBacklinks: (id: string)            => ipcRenderer.invoke(IPC.NODE_GET_BACKLINKS, id),
  },

  // ── Import ───────────────────────────────────────────────
  import: {
    preview: (sourceRoot: string) => ipcRenderer.invoke(IPC.IMPORT_PREVIEW, sourceRoot),
    start:   (opts: unknown)      => ipcRenderer.invoke(IPC.IMPORT_START, opts),
    onProgress: (cb: (data: unknown) => void) => {
      const handler = (_: unknown, data: unknown) => cb(data)
      ipcRenderer.on(IPC.IMPORT_PROGRESS, handler)
      return () => ipcRenderer.removeListener(IPC.IMPORT_PROGRESS, handler)
    },
    onComplete: (cb: (result: unknown) => void) => {
      const handler = (_: unknown, result: unknown) => cb(result)
      ipcRenderer.once(IPC.IMPORT_COMPLETE, handler)
      return () => ipcRenderer.removeListener(IPC.IMPORT_COMPLETE, handler)
    },
  },

  // ── Backup ───────────────────────────────────────────────
  backup: {
    create:      (vaultId: string, note?: string) => ipcRenderer.invoke(IPC.BACKUP_CREATE, vaultId, note),
    list:        (vaultId: string)                => ipcRenderer.invoke(IPC.BACKUP_LIST, vaultId),
    restore:     (snapshotId: string)             => ipcRenderer.invoke(IPC.BACKUP_RESTORE, snapshotId),
    exportVault: (vaultId: string, destPath: string) => ipcRenderer.invoke(IPC.BACKUP_EXPORT_VAULT, vaultId, destPath),
  },

  // ── Template ─────────────────────────────────────────────
  template: {
    list:      (entityType?: string)       => ipcRenderer.invoke(IPC.TEMPLATE_LIST, entityType),
    get:       (id: string)               => ipcRenderer.invoke(IPC.TEMPLATE_GET, id),
    getByType: (entityType: string)       => ipcRenderer.invoke(IPC.TEMPLATE_GET_BY_TYPE, entityType),
    create:    (opts: unknown)            => ipcRenderer.invoke(IPC.TEMPLATE_CREATE, opts),
    update:    (id: string, patch: unknown) => ipcRenderer.invoke(IPC.TEMPLATE_UPDATE, id, patch),
    delete:    (id: string)               => ipcRenderer.invoke(IPC.TEMPLATE_DELETE, id),
  },

  // ── Attachment ───────────────────────────────────────────
  attachment: {
    list:   (nodeId: string)                        => ipcRenderer.invoke(IPC.ATTACHMENT_LIST, nodeId),
    add:    (nodeId: string, sourcePath: string)    => ipcRenderer.invoke(IPC.ATTACHMENT_ADD, nodeId, sourcePath),
    delete: (attachmentId: string)                  => ipcRenderer.invoke(IPC.ATTACHMENT_DELETE, attachmentId),
  },

  // ── Relation ─────────────────────────────────────────────
  relation: {
    list:   (opts: unknown)      => ipcRenderer.invoke(IPC.RELATION_LIST, opts),
    create: (opts: unknown)      => ipcRenderer.invoke(IPC.RELATION_CREATE, opts),
    delete: (id: string)         => ipcRenderer.invoke(IPC.RELATION_DELETE, id),
  },

  // ── Export ───────────────────────────────────────────────
  export: {
    mdZip: (vaultId: string, destPath: string) => ipcRenderer.invoke(IPC.EXPORT_MD_ZIP, vaultId, destPath),
    json:  (vaultId: string, destPath: string) => ipcRenderer.invoke(IPC.EXPORT_JSON,   vaultId, destPath),
  },

  // ── Dialog ───────────────────────────────────────────────
  dialog: {
    openDir:   ()              => ipcRenderer.invoke(IPC.DIALOG_OPEN_DIR),
    openFile:  (opts?: unknown) => ipcRenderer.invoke(IPC.DIALOG_OPEN_FILE, opts),
    saveFile:  (opts?: unknown) => ipcRenderer.invoke(IPC.DIALOG_SAVE_FILE, opts),
  },
}

contextBridge.exposeInMainWorld('api', api)
contextBridge.exposeInMainWorld('shell', {
  openPath: (p: string) => shell.openPath(p),
})

export type API = typeof api
