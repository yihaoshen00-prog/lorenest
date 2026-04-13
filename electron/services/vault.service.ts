import { v4 as uuidv4 } from 'uuid'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { DbService } from './db.service'
import type { Vault } from '../../shared/types'

export class VaultService {
  private get db() { return DbService.getInstance() }

  list(): Vault[] {
    return this.db.all<any>('SELECT * FROM vaults ORDER BY updated_at DESC').map(this.rowToVault)
  }

  getById(id: string): Vault | null {
    const row = this.db.get<any>('SELECT * FROM vaults WHERE id = ?', [id])
    return row ? this.rowToVault(row) : null
  }

  create(opts: { name: string; rootPath: string; sourceImportPath?: string }): Vault {
    const { name, rootPath, sourceImportPath } = opts
    const id  = uuidv4()
    const now = new Date().toISOString()

    const dirs = ['documents', 'entities', 'attachments', 'templates', 'snapshots']
    mkdirSync(rootPath, { recursive: true })
    dirs.forEach(d => mkdirSync(join(rootPath, d), { recursive: true }))

    this.db.run(
      `INSERT INTO vaults (id, name, root_path, source_import_path, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, '0.1.0')`,
      [id, name, rootPath, sourceImportPath ?? null, now, now]
    )
    return this.getById(id)!
  }

  delete(id: string): void {
    this.db.run('DELETE FROM vaults WHERE id = ?', [id])
  }

  touch(id: string): void {
    this.db.run('UPDATE vaults SET updated_at = ? WHERE id = ?', [new Date().toISOString(), id])
  }

  private rowToVault(row: any): Vault {
    return {
      id:               row.id,
      name:             row.name,
      rootPath:         row.root_path,
      sourceImportPath: row.source_import_path ?? undefined,
      createdAt:        row.created_at,
      updatedAt:        row.updated_at,
      version:          row.version,
    }
  }
}

export const vaultService = new VaultService()
