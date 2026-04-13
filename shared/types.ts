// ============================================================
// LoreNest — 共享类型定义（主进程 & 渲染进程共用）
// ============================================================

// ── 基础 ──────────────────────────────────────────────────

export type EntityType =
  | 'document'
  | 'character'
  | 'location'
  | 'faction'
  | 'event'
  | 'item'
  | 'term'
  | 'chapter'
  | 'scene'

export type NodeStatus = 'canon' | 'draft' | 'archived' | 'discarded'

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'tags'
  | 'reference'
  | 'reference_list'

// ── Vault ─────────────────────────────────────────────────

export interface Vault {
  id: string
  name: string
  rootPath: string
  sourceImportPath?: string
  createdAt: string
  updatedAt: string
  version: string
}

// ── FolderNode ────────────────────────────────────────────

export interface FolderNode {
  id: string
  vaultId: string
  name: string
  path: string
  parentId?: string
  sourcePath?: string
  createdAt: string
}

// ── BaseNode（文档与实体的公共字段）────────────────────────

export interface BaseNode {
  id: string
  title: string
  type: EntityType
  folderNodeId?: string
  sourcePath?: string
  aliases: string[]
  tags: string[]
  status: NodeStatus
  createdAt: string
  updatedAt: string
}

// ── Document ──────────────────────────────────────────────

export interface Document extends BaseNode {
  type: 'document'
  content: string
  attachments: string[]
}

// ── FieldValue ────────────────────────────────────────────

export type FieldValue = string | number | boolean | string[] | null

// ── Entity ────────────────────────────────────────────────

export interface Entity extends BaseNode {
  type: Exclude<EntityType, 'document'>
  coverImage?: string
  content: string
  fields: Record<string, FieldValue>
  attachments: string[]
}

export type AnyNode = Document | Entity

// ── FieldDefinition ───────────────────────────────────────

export interface FieldDefinition {
  id: string
  name: string
  key: string
  type: FieldType
  defaultValue?: FieldValue
  options?: string[]        // for select / multiselect
  order: number
  hidden: boolean
}

// ── Template ──────────────────────────────────────────────

export interface Template {
  id: string
  name: string
  entityType: EntityType
  contentTemplate: string
  fields: FieldDefinition[]
  createdAt: string
}

// ── Link ──────────────────────────────────────────────────

export interface Link {
  id: string
  sourceId: string
  targetId: string
  targetTitle: string       // 冗余存储，用于快速展示反链
  createdAt: string
}

// ── Relation ──────────────────────────────────────────────

export interface Relation {
  id:           string
  vaultId:      string
  sourceId:     string
  targetId:     string
  relationType: string   // 自定义关系标签，如"隶属于"、"对立"、"恋人"
  note?:        string
  createdAt:    string
}

// ── Attachment ────────────────────────────────────────────

export interface Attachment {
  id: string
  nodeId: string
  fileName: string
  filePath: string
  mimeType: string
  size: number
  createdAt: string
}

// ── Snapshot ─────────────────────────────────────────────

export interface Snapshot {
  id: string
  nodeId: string
  content: string
  fields: string            // JSON string
  createdAt: string
  note?: string
}

// ── Import ────────────────────────────────────────────────

export type ImportMode = 'mirror_new_vault' | 'merge_into_existing'
export type ImportStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial'

export interface ImportJob {
  id: string
  vaultId: string
  sourceRoot: string
  mode: ImportMode
  status: ImportStatus
  importedFiles: number
  importedFolders: number
  failedFiles: number
  startedAt: string
  finishedAt?: string
}

export interface ImportPreview {
  totalFiles: number
  totalFolders: number
  supportedFiles: number
  unsupportedFiles: number
  conflicts: string[]
  tree: ImportTreeNode[]
}

export interface ImportTreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  fileType?: string
  suggestedEntityType?: EntityType
  conflict?: boolean
  children?: ImportTreeNode[]
}

export interface ImportResult {
  jobId:             string
  vaultId:           string
  importedDocuments: number
  importedFolders:   number
  failedFiles:       Array<{ path: string; reason: string }>
  warnings:          string[]
}

// ── IPC Channel 定义 ──────────────────────────────────────

export const IPC = {
  // Vault
  VAULT_LIST:          'vault:list',
  VAULT_CREATE:        'vault:create',
  VAULT_OPEN:          'vault:open',
  VAULT_DELETE:        'vault:delete',
  VAULT_GET_CURRENT:   'vault:getCurrent',

  // FolderNode
  FOLDER_LIST:         'folder:list',
  FOLDER_CREATE:       'folder:create',
  FOLDER_RENAME:       'folder:rename',
  FOLDER_DELETE:       'folder:delete',

  // Node (Document + Entity)
  NODE_LIST:           'node:list',
  NODE_GET:            'node:get',
  NODE_CREATE:         'node:create',
  NODE_UPDATE:         'node:update',
  NODE_DELETE:         'node:delete',
  NODE_RESTORE:        'node:restore',
  NODE_SEARCH:         'node:search',
  NODE_GET_BACKLINKS:  'node:getBacklinks',

  // Import
  IMPORT_PREVIEW:      'import:preview',
  IMPORT_START:        'import:start',
  IMPORT_PROGRESS:     'import:progress',   // push event
  IMPORT_COMPLETE:     'import:complete',   // push event

  // Backup
  BACKUP_CREATE:       'backup:create',
  BACKUP_LIST:         'backup:list',
  BACKUP_RESTORE:      'backup:restore',
  BACKUP_EXPORT_VAULT: 'backup:exportVault',

  // Template
  TEMPLATE_LIST:        'template:list',
  TEMPLATE_GET:         'template:get',
  TEMPLATE_GET_BY_TYPE: 'template:getByType',
  TEMPLATE_CREATE:      'template:create',
  TEMPLATE_UPDATE:      'template:update',
  TEMPLATE_DELETE:      'template:delete',

  // Attachment
  ATTACHMENT_LIST:     'attachment:list',
  ATTACHMENT_ADD:      'attachment:add',
  ATTACHMENT_DELETE:   'attachment:delete',

  // Relation
  RELATION_LIST:       'relation:list',
  RELATION_CREATE:     'relation:create',
  RELATION_DELETE:     'relation:delete',

  // Export
  EXPORT_MD_ZIP:       'export:mdZip',
  EXPORT_JSON:         'export:json',

  // System
  DIALOG_OPEN_DIR:     'dialog:openDir',
  DIALOG_OPEN_FILE:    'dialog:openFile',
  DIALOG_SAVE_FILE:    'dialog:saveFile',
} as const
