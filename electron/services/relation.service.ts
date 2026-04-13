import { randomUUID } from 'crypto'
import { DbService }  from './db.service'
import type { Relation } from '../../shared/types'

interface RelationRow {
  id:            string
  vault_id:      string
  source_id:     string
  target_id:     string
  relation_type: string
  note:          string | null
  created_at:    string
}

function toRelation(row: RelationRow): Relation {
  return {
    id:           row.id,
    vaultId:      row.vault_id,
    sourceId:     row.source_id,
    targetId:     row.target_id,
    relationType: row.relation_type,
    note:         row.note ?? undefined,
    createdAt:    row.created_at,
  }
}

export class RelationService {
  private get db() { return DbService.getInstance() }

  /** 列出某 vault 下的全部关系，或指定节点参与的关系 */
  list(opts: { vaultId: string; nodeId?: string }): Relation[] {
    const { vaultId, nodeId } = opts
    let rows: RelationRow[]
    if (nodeId) {
      rows = this.db.all<RelationRow>(
        `SELECT * FROM relations WHERE vault_id = ? AND (source_id = ? OR target_id = ?) ORDER BY created_at`,
        [vaultId, nodeId, nodeId]
      )
    } else {
      rows = this.db.all<RelationRow>(
        `SELECT * FROM relations WHERE vault_id = ? ORDER BY created_at`,
        [vaultId]
      )
    }
    return rows.map(toRelation)
  }

  /** 创建具名关系 */
  create(opts: {
    vaultId:      string
    sourceId:     string
    targetId:     string
    relationType: string
    note?:        string
  }): Relation {
    const id  = randomUUID()
    const now = new Date().toISOString()
    this.db.run(
      `INSERT INTO relations (id, vault_id, source_id, target_id, relation_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, opts.vaultId, opts.sourceId, opts.targetId, opts.relationType, opts.note ?? null, now]
    )
    return {
      id,
      vaultId:      opts.vaultId,
      sourceId:     opts.sourceId,
      targetId:     opts.targetId,
      relationType: opts.relationType,
      note:         opts.note,
      createdAt:    now,
    }
  }

  /** 删除关系 */
  delete(id: string): void {
    this.db.run(`DELETE FROM relations WHERE id = ?`, [id])
  }
}

export const relationService = new RelationService()
