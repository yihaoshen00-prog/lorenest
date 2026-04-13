import { v4 as uuidv4 } from 'uuid'
import { DbService } from './db.service'
import type { Template, FieldDefinition, EntityType } from '../../shared/types'

export class TemplateService {
  private get db() { return DbService.getInstance() }

  list(entityType?: EntityType): Template[] {
    const rows = entityType
      ? this.db.all<any>('SELECT * FROM templates WHERE entity_type = ? ORDER BY name ASC', [entityType])
      : this.db.all<any>('SELECT * FROM templates ORDER BY entity_type, name ASC')
    return rows.map(this.rowToTemplate)
  }

  get(id: string): Template | null {
    const row = this.db.get<any>('SELECT * FROM templates WHERE id = ?', [id])
    return row ? this.rowToTemplate(row) : null
  }

  /** 按 entityType 取第一个模板（用于字段定义展示） */
  getByType(entityType: EntityType): Template | null {
    const row = this.db.get<any>(
      'SELECT * FROM templates WHERE entity_type = ? ORDER BY rowid ASC LIMIT 1',
      [entityType]
    )
    return row ? this.rowToTemplate(row) : null
  }

  create(opts: { name: string; entityType: EntityType; contentTemplate?: string; fields?: FieldDefinition[] }): Template {
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO templates (id, name, entity_type, content_template, fields, created_at) VALUES (?,?,?,?,?,?)',
      [id, opts.name, opts.entityType, opts.contentTemplate ?? '', JSON.stringify(opts.fields ?? []), now]
    )
    return this.get(id)!
  }

  update(id: string, patch: Partial<{ name: string; contentTemplate: string; fields: FieldDefinition[] }>): Template | null {
    const sets: string[] = []
    const params: any[] = []
    if (patch.name            !== undefined) { sets.push('name = ?');             params.push(patch.name) }
    if (patch.contentTemplate !== undefined) { sets.push('content_template = ?'); params.push(patch.contentTemplate) }
    if (patch.fields          !== undefined) { sets.push('fields = ?');           params.push(JSON.stringify(patch.fields)) }
    if (sets.length === 0) return this.get(id)
    params.push(id)
    this.db.run(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`, params)
    return this.get(id)
  }

  delete(id: string): void {
    this.db.run('DELETE FROM templates WHERE id = ?', [id])
  }

  private rowToTemplate(row: any): Template {
    return {
      id:              row.id,
      name:            row.name,
      entityType:      row.entity_type as EntityType,
      contentTemplate: row.content_template,
      fields:          JSON.parse(row.fields || '[]') as FieldDefinition[],
      createdAt:       row.created_at,
    }
  }
}

export const templateService = new TemplateService()
