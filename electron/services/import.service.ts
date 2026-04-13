import { v4 as uuidv4 } from 'uuid'
import { readdirSync, readFileSync } from 'fs'
import { join, extname, basename, relative } from 'path'
import { DbService } from './db.service'
import { vaultService } from './vault.service'
import { nodeService } from './node.service'
import type {
  ImportPreview, ImportTreeNode, ImportResult, ImportMode, EntityType
} from '../../shared/types'

// 支持的文件类型
const SUPPORTED_EXT = new Set(['.md', '.txt', '.docx', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'])
const TEXT_EXT      = new Set(['.md', '.txt'])
const DOC_EXT       = new Set(['.docx', '.pdf'])
const IMAGE_EXT     = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])

// 文件夹名 → 实体类型推断规则
const FOLDER_TYPE_MAP: Array<{ patterns: RegExp; type: EntityType }> = [
  { patterns: /^(角色|characters?|人物|chara)/i, type: 'character'  },
  { patterns: /^(地点|location|地图|map|regions?|场所)/i, type: 'location' },
  { patterns: /^(势力|faction|组织|organization|clan)/i, type: 'faction'  },
  { patterns: /^(事件|event|历史|history)/i,              type: 'event'    },
  { patterns: /^(物品|item|道具|prop)/i,                  type: 'item'     },
  { patterns: /^(术语|term|词汇|glossary|名词)/i,         type: 'term'     },
  { patterns: /^(章节|chapter|卷|vol)/i,                  type: 'chapter'  },
  { patterns: /^(场景|scene|scenes?|plot|剧情)/i,         type: 'scene'    },
]

function inferEntityType(folderName: string): EntityType | undefined {
  for (const rule of FOLDER_TYPE_MAP) {
    if (rule.patterns.test(folderName)) return rule.type
  }
  return undefined
}

export class ImportService {
  private get db() { return DbService.getInstance() }

  // ── 预览扫描 ─────────────────────────────────────────────

  preview(sourceRoot: string): ImportPreview {
    let totalFiles = 0, totalFolders = 0, supportedFiles = 0, unsupportedFiles = 0
    const conflicts: string[] = []

    const buildTree = (dirPath: string, parentInferredType?: EntityType): ImportTreeNode[] => {
      const entries = readdirSync(dirPath, { withFileTypes: true })
      const nodes: ImportTreeNode[] = []

      for (const entry of entries) {
        const fullPath  = join(dirPath, entry.name)
        const relPath   = relative(sourceRoot, fullPath)

        if (entry.isDirectory()) {
          totalFolders++
          const inferredType = inferEntityType(entry.name)
          nodes.push({
            name:     entry.name,
            path:     relPath,
            type:     'folder',
            suggestedEntityType: inferredType,
            children: buildTree(fullPath, inferredType ?? parentInferredType),
          })
        } else {
          totalFiles++
          const ext = extname(entry.name).toLowerCase()
          if (SUPPORTED_EXT.has(ext)) {
            supportedFiles++
            nodes.push({
              name:                entry.name,
              path:                relPath,
              type:                'file',
              fileType:            ext,
              suggestedEntityType: parentInferredType,
            })
          } else {
            unsupportedFiles++
            nodes.push({ name: entry.name, path: relPath, type: 'file', fileType: ext })
          }
        }
      }
      return nodes
    }

    const tree = buildTree(sourceRoot)

    return { totalFiles, totalFolders, supportedFiles, unsupportedFiles, conflicts, tree }
  }

  // ── 正式导入 ─────────────────────────────────────────────

  async start(opts: {
    sourceRoot: string
    mode: ImportMode
    vaultId?: string         // merge_into_existing 时必填
    vaultName?: string       // mirror_new_vault 时用于创建仓库
    targetFolderNodeId?: string
    folderTypeMap?: Record<string, EntityType>
    onProgress?: (data: { processed: number; total: number; current: string }) => void
  }): Promise<ImportResult> {
    const { sourceRoot, mode, onProgress, folderTypeMap = {} } = opts

    // 创建或获取 vault
    let vaultId: string
    if (mode === 'mirror_new_vault') {
      const vaultName = opts.vaultName ?? basename(sourceRoot)
      const vault = vaultService.create({ name: vaultName, rootPath: sourceRoot, sourceImportPath: sourceRoot })
      vaultId = vault.id
    } else {
      if (!opts.vaultId) throw new Error('vaultId required for merge mode')
      vaultId = opts.vaultId
    }

    // 创建导入任务记录
    const jobId  = uuidv4()
    const now    = new Date().toISOString()
    this.db.run(
      `INSERT INTO import_jobs (id, vault_id, source_root, mode, status, started_at) VALUES (?,?,?,?,'running',?)`,
      [jobId, vaultId, sourceRoot, mode, now]
    )

    const failedFiles: Array<{ path: string; reason: string }> = []
    let importedFiles = 0, importedFolders = 0

    // 构建文件列表
    const allFiles = this.collectFiles(sourceRoot)
    const total    = allFiles.length

    // 递归导入
    const folderNodeCache = new Map<string, string>() // dirPath → folderNodeId

    const ensureFolderNode = (dirPath: string, parentId?: string): string => {
      if (folderNodeCache.has(dirPath)) return folderNodeCache.get(dirPath)!
      const name   = basename(dirPath)
      const relPath = relative(sourceRoot, dirPath)
      const id     = uuidv4()
      this.db.run(
        'INSERT INTO folder_nodes (id, vault_id, name, path, parent_id, source_path, created_at) VALUES (?,?,?,?,?,?,?)',
        [id, vaultId, name, relPath, parentId ?? null, dirPath, now]
      )
      importedFolders++
      folderNodeCache.set(dirPath, id)
      return id
    }

    // 确保根目录下各子文件夹都建好
    const rootFolderId = opts.targetFolderNodeId

    for (let i = 0; i < allFiles.length; i++) {
      const filePath = allFiles[i]
      const relPath  = relative(sourceRoot, filePath)
      onProgress?.({ processed: i + 1, total, current: relPath })

      try {
        const dirPath  = join(filePath, '..')
        const parentId = dirPath === sourceRoot
          ? rootFolderId
          : ensureFolderNode(dirPath, this.getParentFolderId(dirPath, sourceRoot, folderNodeCache, rootFolderId, now, vaultId))

        const ext   = extname(filePath).toLowerCase()
        const title = basename(filePath, extname(filePath))

        // 推断实体类型
        const folderName       = basename(dirPath)
        const customType       = folderTypeMap[folderName]
        const inferredType     = customType ?? inferEntityType(folderName) ?? 'document'

        if (TEXT_EXT.has(ext)) {
          const raw     = this.readTextSafe(filePath)
          const content = raw ?? ''
          nodeService.create({
            vaultId, title, type: inferredType,
            folderNodeId: parentId,
            sourcePath: filePath,
            content,
            status: 'draft',
          })
          importedFiles++
        } else if (DOC_EXT.has(ext) || IMAGE_EXT.has(ext)) {
          // 非文本文件：建文档节点，正文留空，附件引用
          nodeService.create({
            vaultId, title, type: inferredType,
            folderNodeId: parentId,
            sourcePath: filePath,
            content: `<!-- 附件: ${relPath} -->`,
            status: 'draft',
          })
          importedFiles++
        } else {
          // 不支持的类型：记录附件引用
          nodeService.create({
            vaultId, title: basename(filePath), type: 'document',
            folderNodeId: parentId,
            sourcePath: filePath,
            content: `<!-- 未知类型附件: ${relPath} -->`,
            status: 'draft',
          })
          importedFiles++
        }
      } catch (err: any) {
        failedFiles.push({ path: relative(sourceRoot, filePath), reason: err.message })
      }
    }

    // 更新任务状态
    const status = failedFiles.length > 0 ? 'partial' : 'completed'
    this.db.run(
      'UPDATE import_jobs SET status=?, imported_files=?, imported_folders=?, failed_files=?, finished_at=? WHERE id=?',
      [status, importedFiles, importedFolders, failedFiles.length, new Date().toISOString(), jobId]
    )

    return { jobId, vaultId, importedDocuments: importedFiles, importedFolders, failedFiles, warnings: [] }
  }

  // ── 辅助方法 ──────────────────────────────────────────────

  private collectFiles(dir: string): string[] {
    const results: string[] = []
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...this.collectFiles(full))
      } else {
        results.push(full)
      }
    }
    return results
  }

  private getParentFolderId(
    dirPath: string,
    sourceRoot: string,
    cache: Map<string, string>,
    rootFolderId: string | undefined,
    now: string,
    vaultId: string
  ): string | undefined {
    const parentDir = join(dirPath, '..')
    if (parentDir === sourceRoot || parentDir === dirPath) return rootFolderId
    if (cache.has(parentDir)) return cache.get(parentDir)

    const grandParentId = this.getParentFolderId(parentDir, sourceRoot, cache, rootFolderId, now, vaultId)
    const name    = basename(parentDir)
    const relPath = relative(sourceRoot, parentDir)
    const id      = uuidv4()
    this.db.run(
      'INSERT OR IGNORE INTO folder_nodes (id, vault_id, name, path, parent_id, source_path, created_at) VALUES (?,?,?,?,?,?,?)',
      [id, vaultId, name, relPath, grandParentId ?? null, parentDir, now]
    )
    cache.set(parentDir, id)
    return id
  }

  private readTextSafe(filePath: string): string | null {
    try {
      return readFileSync(filePath, 'utf-8')
    } catch {
      // 尝试 GBK（Windows 常见编码）
      try {
        const buf = readFileSync(filePath)
        return buf.toString('latin1') // 退而求其次，保留原始字节内容
      } catch {
        return null
      }
    }
  }
}

export const importService = new ImportService()
