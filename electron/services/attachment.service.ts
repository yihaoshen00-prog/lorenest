import { v4 as uuidv4 } from 'uuid'
import * as fs   from 'fs'
import * as path from 'path'
import { app }   from 'electron'
import { DbService } from './db.service'
import type { Attachment } from '../../shared/types'

export class AttachmentService {
  private get db() { return DbService.getInstance() }

  /** 获取节点的附件列表 */
  list(nodeId: string): Attachment[] {
    return this.db.all<any>(
      'SELECT * FROM attachments WHERE node_id = ? ORDER BY created_at ASC',
      [nodeId]
    ).map(this.rowToAttachment)
  }

  /**
   * 将源文件复制到 userData/lorenest/attachments/<nodeId>/ 目录下，
   * 并在 DB 中记录元数据。
   */
  add(nodeId: string, sourcePath: string): Attachment {
    const fileName = path.basename(sourcePath)
    const destDir  = path.join(app.getPath('userData'), 'lorenest', 'attachments', nodeId)
    fs.mkdirSync(destDir, { recursive: true })

    // 如果同名文件已存在，追加时间戳避免覆盖
    let destName = fileName
    if (fs.existsSync(path.join(destDir, destName))) {
      const ext  = path.extname(fileName)
      const base = path.basename(fileName, ext)
      destName   = `${base}_${Date.now()}${ext}`
    }
    const destPath = path.join(destDir, destName)
    fs.copyFileSync(sourcePath, destPath)

    const stat     = fs.statSync(destPath)
    const mimeType = this.guessMime(destName)
    const id       = uuidv4()
    const now      = new Date().toISOString()

    this.db.run(
      'INSERT INTO attachments (id, node_id, file_name, file_path, mime_type, size, created_at) VALUES (?,?,?,?,?,?,?)',
      [id, nodeId, destName, destPath, mimeType, stat.size, now]
    )
    return this.rowToAttachment(this.db.get('SELECT * FROM attachments WHERE id = ?', [id])!)
  }

  /** 从磁盘和 DB 删除附件 */
  delete(attachmentId: string): void {
    const row = this.db.get<any>('SELECT * FROM attachments WHERE id = ?', [attachmentId])
    if (!row) return
    try { fs.unlinkSync(row.file_path) } catch { /* 文件可能已不存在 */ }
    this.db.run('DELETE FROM attachments WHERE id = ?', [attachmentId])
  }

  private guessMime(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase()
    const map: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.md':  'text/markdown', '.txt': 'text/plain',
      '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    }
    return map[ext] ?? 'application/octet-stream'
  }

  private rowToAttachment(row: any): Attachment {
    return {
      id:        row.id,
      nodeId:    row.node_id,
      fileName:  row.file_name,
      filePath:  row.file_path,
      mimeType:  row.mime_type,
      size:      row.size,
      createdAt: row.created_at,
    }
  }
}

export const attachmentService = new AttachmentService()
