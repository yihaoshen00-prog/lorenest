import type { IpcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import * as fs   from 'fs'
import * as path from 'path'
import { IPC } from '../../shared/types'
import { DbService } from '../services/db.service'

export function registerBackupIpc(ipcMain: IpcMain): void {
  const db = () => DbService.getInstance()

  ipcMain.handle(IPC.BACKUP_CREATE, (_, vaultId: string, note?: string) => {
    const nodes = db().all<any>('SELECT * FROM nodes WHERE vault_id = ? AND deleted = 0', [vaultId])
    const now   = new Date().toISOString()
    db().transaction(() => {
      for (const n of nodes) {
        db().db.run(
          'INSERT INTO snapshots (id, node_id, content, fields, note, created_at) VALUES (?,?,?,?,?,?)',
          [uuidv4(), n.id, n.content, n.fields, note ?? null, now]
        )
      }
    })
    return { snapshotCount: nodes.length, createdAt: now }
  })

  ipcMain.handle(IPC.BACKUP_LIST, (_, vaultId: string) => {
    return db().all(
      `SELECT s.created_at, s.note, COUNT(*) as node_count
       FROM snapshots s
       JOIN nodes n ON s.node_id = n.id
       WHERE n.vault_id = ?
       GROUP BY s.created_at
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [vaultId]
    )
  })

  ipcMain.handle(IPC.BACKUP_RESTORE, (_, createdAt: string) => {
    const snaps = db().all<any>('SELECT * FROM snapshots WHERE created_at = ?', [createdAt])
    if (!snaps.length) throw new Error('Snapshot not found')
    const now = new Date().toISOString()
    db().transaction(() => {
      for (const snap of snaps) {
        db().run('UPDATE nodes SET content = ?, fields = ?, updated_at = ? WHERE id = ?',
          [snap.content, snap.fields, now, snap.node_id])
      }
    })
    return { restored: true, nodeCount: snaps.length }
  })

  ipcMain.handle(IPC.BACKUP_EXPORT_VAULT, (_, vaultId: string, destPath: string) => {
    const nodes = db().all<any>('SELECT * FROM nodes WHERE vault_id = ? AND deleted = 0', [vaultId])
    if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true })

    let exported = 0
    for (const n of nodes) {
      try {
        const fields = JSON.parse(n.fields || '{}')
        const tags   = JSON.parse(n.tags   || '[]')

        // Build YAML frontmatter
        const frontmatterLines = [
          '---',
          `id: ${n.id}`,
          `title: "${n.title.replace(/"/g, '\\"')}"`,
          `type: ${n.type}`,
          `status: ${n.status}`,
          tags.length > 0 ? `tags: [${tags.map((t: string) => `"${t}"`).join(', ')}]` : 'tags: []',
          `created_at: ${n.created_at}`,
          `updated_at: ${n.updated_at}`,
        ]
        // Add custom fields
        for (const [k, v] of Object.entries(fields)) {
          if (v !== null && v !== undefined && v !== '') {
            frontmatterLines.push(`${k}: ${JSON.stringify(v)}`)
          }
        }
        frontmatterLines.push('---')

        const content = n.content || ''
        const fileContent = frontmatterLines.join('\n') + '\n\n' + content

        // Sanitize filename
        const safeName = n.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)
        const filePath = path.join(destPath, `${safeName}.md`)
        fs.writeFileSync(filePath, fileContent, 'utf-8')
        exported++
      } catch {
        // skip problematic nodes
      }
    }
    return { exported, total: nodes.length }
  })
}
