import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import { app } from 'electron'
import { join, dirname } from 'path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'

/**
 * DbService — 单例，基于 sql.js (WASM SQLite)
 * 无需 Visual Studio / 原生编译，跨平台开箱即用
 * 策略：启动时从 .db 文件加载进内存；每次写操作后持久化回文件
 */
export class DbService {
  private static instance: DbService
  private _db:     Database | null  = null
  private _SQL:    SqlJsStatic | null = null
  private _dbPath: string = ''

  private constructor() {}

  static getInstance(): DbService {
    if (!DbService.instance) {
      DbService.instance = new DbService()
    }
    return DbService.instance
  }

  get db(): Database {
    if (!this._db) throw new Error('Database not initialized. Call initialize() first.')
    return this._db
  }

  async initialize(): Promise<void> {
    const userDataPath = app.getPath('userData')
    const dbDir = join(userDataPath, 'lorenest')
    mkdirSync(dbDir, { recursive: true })
    this._dbPath = join(dbDir, 'lorenest.db')

    // 加载 sql.js WASM
    // locateFile 确保打包后也能找到 wasm 文件（extraResources 里）
    const wasmPath = app.isPackaged
      ? join(process.resourcesPath, 'sql-wasm.wasm')
      : join(dirname(require.resolve('sql.js')), 'sql-wasm.wasm')
    this._SQL = await initSqlJs({ locateFile: () => wasmPath })

    // 从磁盘加载已有数据库，或新建
    if (existsSync(this._dbPath)) {
      const fileBuffer = readFileSync(this._dbPath)
      this._db = new this._SQL.Database(fileBuffer)
    } else {
      this._db = new this._SQL.Database()
    }

    this.runMigrations()
    console.log(`[DB] Initialized at: ${this._dbPath}`)
  }

  /** 将内存数据库持久化到磁盘 */
  persist(): void {
    if (!this._db) return
    const data = this._db.export()
    writeFileSync(this._dbPath, Buffer.from(data))
  }

  close(): void {
    this.persist()
    this._db?.close()
    this._db = null
  }

  // ── sql.js 兼容的辅助方法（模仿 better-sqlite3 API）─────

  /** 执行不返回结果的语句 */
  run(sql: string, params: any[] = []): void {
    this.db.run(sql, params)
    this.persist()
  }

  /** 查询多行 */
  all<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql)
    stmt.bind(params)
    const rows: T[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T)
    }
    stmt.free()
    return rows
  }

  /** 查询单行 */
  get<T = any>(sql: string, params: any[] = []): T | null {
    const rows = this.all<T>(sql, params)
    return rows[0] ?? null
  }

  /** 执行事务（函数内的所有操作原子提交） */
  transaction(fn: () => void): void {
    this.db.run('BEGIN')
    try {
      fn()
      this.db.run('COMMIT')
      this.persist()
    } catch (e) {
      this.db.run('ROLLBACK')
      throw e
    }
  }

  // ── Schema 初始化 ─────────────────────────────────────

  private runMigrations(): void {
    const db = this.db

    db.run(`
      CREATE TABLE IF NOT EXISTS vaults (
        id                 TEXT PRIMARY KEY,
        name               TEXT NOT NULL,
        root_path          TEXT NOT NULL UNIQUE,
        source_import_path TEXT,
        created_at         TEXT NOT NULL,
        updated_at         TEXT NOT NULL,
        version            TEXT NOT NULL DEFAULT '0.1.0'
      );

      CREATE TABLE IF NOT EXISTS folder_nodes (
        id          TEXT PRIMARY KEY,
        vault_id    TEXT NOT NULL,
        name        TEXT NOT NULL,
        path        TEXT NOT NULL,
        parent_id   TEXT,
        source_path TEXT,
        created_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nodes (
        id             TEXT PRIMARY KEY,
        vault_id       TEXT NOT NULL,
        folder_node_id TEXT,
        title          TEXT NOT NULL,
        type           TEXT NOT NULL,
        status         TEXT NOT NULL DEFAULT 'draft',
        aliases        TEXT NOT NULL DEFAULT '[]',
        tags           TEXT NOT NULL DEFAULT '[]',
        content        TEXT NOT NULL DEFAULT '',
        fields         TEXT NOT NULL DEFAULT '{}',
        cover_image    TEXT,
        source_path    TEXT,
        deleted        INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS links (
        id           TEXT PRIMARY KEY,
        source_id    TEXT NOT NULL,
        target_id    TEXT NOT NULL,
        target_title TEXT NOT NULL,
        created_at   TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id         TEXT PRIMARY KEY,
        node_id    TEXT NOT NULL,
        file_name  TEXT NOT NULL,
        file_path  TEXT NOT NULL,
        mime_type  TEXT NOT NULL DEFAULT '',
        size       INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS templates (
        id               TEXT PRIMARY KEY,
        name             TEXT NOT NULL,
        entity_type      TEXT NOT NULL,
        content_template TEXT NOT NULL DEFAULT '',
        fields           TEXT NOT NULL DEFAULT '[]',
        created_at       TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id         TEXT PRIMARY KEY,
        node_id    TEXT NOT NULL,
        content    TEXT NOT NULL,
        fields     TEXT NOT NULL DEFAULT '{}',
        note       TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS import_jobs (
        id               TEXT PRIMARY KEY,
        vault_id         TEXT NOT NULL,
        source_root      TEXT NOT NULL,
        mode             TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pending',
        imported_files   INTEGER NOT NULL DEFAULT 0,
        imported_folders INTEGER NOT NULL DEFAULT 0,
        failed_files     INTEGER NOT NULL DEFAULT 0,
        started_at       TEXT NOT NULL,
        finished_at      TEXT
      );

      CREATE TABLE IF NOT EXISTS relations (
        id            TEXT PRIMARY KEY,
        vault_id      TEXT NOT NULL,
        source_id     TEXT NOT NULL,
        target_id     TEXT NOT NULL,
        relation_type TEXT NOT NULL DEFAULT '',
        note          TEXT,
        created_at    TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
      CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
      CREATE INDEX IF NOT EXISTS idx_relations_vault  ON relations(vault_id);
    `)

    this.seedDefaultTemplates()
    this.persist()
  }

  private seedDefaultTemplates(): void {
    const count = (this.get<{ c: number }>('SELECT COUNT(*) as c FROM templates'))?.c ?? 0
    if (count > 0) return

    const now = new Date().toISOString()
    const defaults = [
      { id: 'tpl-character', name: '角色', type: 'character',
        content: '## 外貌\n\n## 性格\n\n## 背景\n\n## 动机\n\n',
        fields: JSON.stringify([
          { id: 'f1', name: '年龄', key: 'age', type: 'number', order: 0, hidden: false },
          { id: 'f2', name: '性别', key: 'gender', type: 'select', options: ['男', '女', '未知'], order: 1, hidden: false },
          { id: 'f3', name: '所属势力', key: 'faction', type: 'reference', order: 2, hidden: false },
        ])
      },
      { id: 'tpl-location', name: '地点', type: 'location',
        content: '## 地理描述\n\n## 历史\n\n',
        fields: JSON.stringify([
          { id: 'f1', name: '地点类型', key: 'locationType', type: 'select', options: ['城市', '村庄', '地标', '区域', '其他'], order: 0, hidden: false },
        ])
      },
      { id: 'tpl-faction', name: '势力', type: 'faction',
        content: '## 概述\n\n## 目标\n\n',
        fields: JSON.stringify([])
      },
      { id: 'tpl-event', name: '事件', type: 'event',
        content: '## 事件经过\n\n## 结果\n\n',
        fields: JSON.stringify([
          { id: 'f1', name: '发生时间', key: 'eventDate', type: 'text', order: 0, hidden: false },
        ])
      },
      { id: 'tpl-chapter', name: '章节', type: 'chapter',
        content: '## 章节摘要\n\n',
        fields: JSON.stringify([
          { id: 'f1', name: '章节编号', key: 'chapterNum', type: 'number', order: 0, hidden: false },
        ])
      },
      { id: 'tpl-scene', name: '场景', type: 'scene',
        content: '## 场景描述\n\n',
        fields: JSON.stringify([])
      },
    ]

    this.transaction(() => {
      for (const t of defaults) {
        this.db.run(
          'INSERT INTO templates (id, name, entity_type, content_template, fields, created_at) VALUES (?,?,?,?,?,?)',
          [t.id, t.name, t.type, t.content, t.fields, now]
        )
      }
    })
  }
}
