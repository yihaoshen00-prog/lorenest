import type { IpcMain } from 'electron'
import AdmZip from 'adm-zip'
import { writeFileSync } from 'fs'
import { IPC } from '../../shared/types'
import { DbService } from '../services/db.service'

// ── 工具：构造带 YAML 前置信息的 Markdown 内容 ───────────

function buildMarkdown(node: any): string {
  const fields = JSON.parse(node.fields  || '{}')
  const tags   = JSON.parse(node.tags    || '[]')
  const aliases = JSON.parse(node.aliases || '[]')

  const fm: string[] = ['---']
  fm.push(`id: ${node.id}`)
  fm.push(`title: "${node.title.replace(/"/g, '\\"')}"`)
  fm.push(`type: ${node.type}`)
  fm.push(`status: ${node.status}`)
  fm.push(aliases.length > 0 ? `aliases: [${aliases.map((a: string) => `"${a}"`).join(', ')}]` : 'aliases: []')
  fm.push(tags.length    > 0 ? `tags: [${tags.map((t: string) => `"${t}"`).join(', ')}]`       : 'tags: []')
  fm.push(`created_at: ${node.created_at}`)
  fm.push(`updated_at: ${node.updated_at}`)
  if (node.cover_image) fm.push(`cover_image: "${node.cover_image}"`)
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined && v !== '') {
      fm.push(`${k}: ${JSON.stringify(v)}`)
    }
  }
  fm.push('---')

  return fm.join('\n') + '\n\n' + (node.content || '')
}

// ── 安全文件名 ────────────────────────────────────────────

function safeName(title: string): string {
  return title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80) || 'untitled'
}

export function registerExportIpc(ipcMain: IpcMain): void {
  const db = () => DbService.getInstance()

  // ── 导出为 Markdown ZIP ───────────────────────────────

  ipcMain.handle(IPC.EXPORT_MD_ZIP, (_, vaultId: string, destPath: string) => {
    const vault   = db().get<any>('SELECT * FROM vaults WHERE id = ?', [vaultId])
    const nodes   = db().all<any>('SELECT * FROM nodes WHERE vault_id = ? AND deleted = 0', [vaultId])
    const folders = db().all<any>('SELECT * FROM folder_nodes WHERE vault_id = ?', [vaultId])

    const zip = new AdmZip()

    // 文件夹路径映射 id -> path
    const folderPath: Record<string, string> = {}
    for (const f of folders) {
      folderPath[f.id] = (f.path as string).replace(/\\/g, '/')
    }

    let exported = 0
    for (const n of nodes) {
      try {
        const content  = buildMarkdown(n)
        const name     = safeName(n.title) + '.md'
        const folder   = n.folder_node_id ? (folderPath[n.folder_node_id] ?? '') : ''
        const zipPath  = folder ? `${folder}/${name}` : name
        zip.addFile(zipPath, Buffer.from(content, 'utf-8'))
        exported++
      } catch { /* skip */ }
    }

    // 在 ZIP 根目录写一份 README
    const vaultName = vault?.name ?? vaultId
    const readme = [
      `# ${vaultName}`,
      '',
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      `共 ${exported} 个节点`,
      '',
      '> 由 LoreNest 导出',
    ].join('\n')
    zip.addFile('README.md', Buffer.from(readme, 'utf-8'))

    zip.writeZip(destPath)
    return { exported, total: nodes.length, path: destPath }
  })

  // ── 导出为 JSON ───────────────────────────────────────

  ipcMain.handle(IPC.EXPORT_JSON, (_, vaultId: string, destPath: string) => {
    const vault      = db().get<any>('SELECT * FROM vaults WHERE id = ?', [vaultId])
    const nodes      = db().all<any>('SELECT * FROM nodes WHERE vault_id = ? AND deleted = 0', [vaultId])
    const folders    = db().all<any>('SELECT * FROM folder_nodes WHERE vault_id = ?', [vaultId])
    const relations  = db().all<any>('SELECT * FROM relations WHERE vault_id = ?', [vaultId])
    const templates  = db().all<any>('SELECT * FROM templates', [])

    const payload = {
      exportedAt: new Date().toISOString(),
      version:    '1.0',
      vault: {
        id:        vault?.id,
        name:      vault?.name,
        version:   vault?.version,
        createdAt: vault?.created_at,
      },
      nodes: nodes.map(n => ({
        id:          n.id,
        title:       n.title,
        type:        n.type,
        status:      n.status,
        aliases:     JSON.parse(n.aliases  || '[]'),
        tags:        JSON.parse(n.tags     || '[]'),
        content:     n.content,
        fields:      JSON.parse(n.fields   || '{}'),
        folderNodeId: n.folder_node_id ?? null,
        coverImage:  n.cover_image ?? null,
        createdAt:   n.created_at,
        updatedAt:   n.updated_at,
      })),
      folders: folders.map(f => ({
        id:       f.id,
        name:     f.name,
        path:     f.path,
        parentId: f.parent_id ?? null,
      })),
      relations: relations.map(r => ({
        id:           r.id,
        sourceId:     r.source_id,
        targetId:     r.target_id,
        relationType: r.relation_type,
        note:         r.note ?? null,
        createdAt:    r.created_at,
      })),
      templates: templates.map(t => ({
        id:              t.id,
        name:            t.name,
        entityType:      t.entity_type,
        contentTemplate: t.content_template,
        fields:          JSON.parse(t.fields || '[]'),
      })),
    }

    writeFileSync(destPath, JSON.stringify(payload, null, 2), 'utf-8')
    return {
      nodes:     nodes.length,
      folders:   folders.length,
      relations: relations.length,
      path:      destPath,
    }
  })
}
