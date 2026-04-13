import { v4 as uuidv4 } from 'uuid'
import { DbService } from './db.service'
import type { AnyNode, EntityType, NodeStatus, FieldValue } from '../../shared/types'

export interface NodeListOptions {
  vaultId:       string
  type?:         EntityType | EntityType[]
  folderNodeId?: string
  status?:       NodeStatus
  deleted?:      boolean
}

export interface NodeCreateOptions {
  vaultId:       string
  title:         string
  type:          EntityType
  folderNodeId?: string
  sourcePath?:   string
  content?:      string
  fields?:       Record<string, FieldValue>
  tags?:         string[]
  status?:       NodeStatus
}

export class NodeService {
  private get db() { return DbService.getInstance() }

  list(opts: NodeListOptions): AnyNode[] {
    const { vaultId, type, folderNodeId, status, deleted = false } = opts
    const conds:  string[] = ['vault_id = ?', 'deleted = ?']
    const params: any[]    = [vaultId, deleted ? 1 : 0]

    if (type) {
      const types = Array.isArray(type) ? type : [type]
      conds.push(`type IN (${types.map(() => '?').join(',')})`)
      params.push(...types)
    }
    if (folderNodeId !== undefined) { conds.push('folder_node_id = ?'); params.push(folderNodeId) }
    if (status)                     { conds.push('status = ?');         params.push(status) }

    const rows = this.db.all<any>(
      `SELECT * FROM nodes WHERE ${conds.join(' AND ')} ORDER BY updated_at DESC`,
      params
    )
    return rows.map(this.rowToNode)
  }

  get(id: string): AnyNode | null {
    const row = this.db.get<any>('SELECT * FROM nodes WHERE id = ?', [id])
    return row ? this.rowToNode(row) : null
  }

  create(opts: NodeCreateOptions): AnyNode {
    const {
      vaultId, title, type, folderNodeId, sourcePath,
      content = '', fields = {}, tags = [], status = 'draft'
    } = opts
    const id  = uuidv4()
    const now = new Date().toISOString()

    this.db.run(
      `INSERT INTO nodes
         (id, vault_id, folder_node_id, title, type, status, aliases, tags,
          content, fields, source_path, deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 0, ?, ?)`,
      [id, vaultId, folderNodeId ?? null, title, type, status,
       JSON.stringify(tags), content, JSON.stringify(fields),
       sourcePath ?? null, now, now]
    )

    this.syncLinks(id, vaultId, content)
    return this.get(id)!
  }

  update(id: string, patch: Partial<{
    title:        string
    content:      string
    tags:         string[]
    aliases:      string[]
    status:       NodeStatus
    fields:       Record<string, FieldValue>
    folderNodeId: string
    coverImage:   string
  }>): AnyNode | null {
    const current = this.get(id)
    if (!current) return null

    const now    = new Date().toISOString()
    const sets:  string[] = ['updated_at = ?']
    const params: any[]   = [now]

    if (patch.title        !== undefined) { sets.push('title = ?');          params.push(patch.title) }
    if (patch.content      !== undefined) { sets.push('content = ?');        params.push(patch.content) }
    if (patch.tags         !== undefined) { sets.push('tags = ?');           params.push(JSON.stringify(patch.tags)) }
    if (patch.aliases      !== undefined) { sets.push('aliases = ?');        params.push(JSON.stringify(patch.aliases)) }
    if (patch.status       !== undefined) { sets.push('status = ?');         params.push(patch.status) }
    if (patch.fields       !== undefined) { sets.push('fields = ?');         params.push(JSON.stringify(patch.fields)) }
    if (patch.folderNodeId !== undefined) { sets.push('folder_node_id = ?'); params.push(patch.folderNodeId) }
    if (patch.coverImage   !== undefined) { sets.push('cover_image = ?');    params.push(patch.coverImage) }

    params.push(id)
    this.db.run(`UPDATE nodes SET ${sets.join(', ')} WHERE id = ?`, params)

    if (patch.content !== undefined) {
      // 需要 vaultId：从已有节点取
      const row = this.db.get<any>('SELECT vault_id FROM nodes WHERE id = ?', [id])
      if (row) this.syncLinks(id, row.vault_id, patch.content)
    }

    return this.get(id)
  }

  softDelete(id: string): void {
    this.db.run('UPDATE nodes SET deleted = 1, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id])
  }

  restore(id: string): void {
    this.db.run('UPDATE nodes SET deleted = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id])
  }

  search(query: string, opts: { vaultId: string; limit?: number }): AnyNode[] {
    const { vaultId, limit = 50 } = opts
    // sql.js 不支持 FTS5，使用 LIKE 全文搜索作为替代
    const q = `%${query}%`
    const rows = this.db.all<any>(
      `SELECT * FROM nodes
       WHERE vault_id = ? AND deleted = 0
         AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
       ORDER BY updated_at DESC
       LIMIT ?`,
      [vaultId, q, q, q, limit]
    )
    return rows.map(this.rowToNode)
  }

  getBacklinks(id: string): AnyNode[] {
    const rows = this.db.all<any>(
      `SELECT n.* FROM nodes n
       JOIN links l ON n.id = l.source_id
       WHERE l.target_id = ? AND n.deleted = 0`,
      [id]
    )
    return rows.map(this.rowToNode)
  }

  private syncLinks(sourceId: string, vaultId: string, content: string): void {
    this.db.run('DELETE FROM links WHERE source_id = ?', [sourceId])

    const regex   = /\[\[([^\]]+)\]\]/g
    const matches = [...content.matchAll(regex)]
    if (matches.length === 0) return

    const now = new Date().toISOString()
    this.db.transaction(() => {
      for (const m of matches) {
        const targetTitle = m[1].trim()
        const target = this.db.get<any>(
          'SELECT id FROM nodes WHERE vault_id = ? AND title = ? AND deleted = 0 LIMIT 1',
          [vaultId, targetTitle]
        )
        if (target) {
          this.db.db.run(
            'INSERT OR IGNORE INTO links (id, source_id, target_id, target_title, created_at) VALUES (?,?,?,?,?)',
            [uuidv4(), sourceId, target.id, targetTitle, now]
          )
        }
      }
    })
  }

  private rowToNode(row: any): AnyNode {
    const base = {
      id:           row.id,
      title:        row.title,
      type:         row.type as EntityType,
      folderNodeId: row.folder_node_id ?? undefined,
      sourcePath:   row.source_path ?? undefined,
      aliases:      JSON.parse(row.aliases || '[]'),
      tags:         JSON.parse(row.tags || '[]'),
      status:       row.status as NodeStatus,
      content:      row.content,
      attachments:  [] as string[],
      createdAt:    row.created_at,
      updatedAt:    row.updated_at,
    }
    if (row.type === 'document') {
      return { ...base, type: 'document' }
    }
    return {
      ...base,
      coverImage: row.cover_image ?? undefined,
      fields:     JSON.parse(row.fields || '{}'),
    } as any
  }
}

export const nodeService = new NodeService()
