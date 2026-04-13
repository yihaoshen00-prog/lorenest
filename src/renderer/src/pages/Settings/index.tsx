import { useEffect, useState, useRef } from 'react'
import { useVaultStore } from '../../stores/vault.store'
import type { Template, EntityType, FieldDefinition } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

const FIELD_TYPES = [
  'text', 'textarea', 'number', 'boolean', 'date',
  'select', 'multiselect', 'tags', 'reference', 'reference_list',
]

const ENTITY_TYPES: { key: EntityType; label: string }[] = [
  { key: 'character', label: '角色' }, { key: 'location', label: '地点' },
  { key: 'faction',   label: '势力' }, { key: 'event',    label: '事件' },
  { key: 'item',      label: '物品' }, { key: 'term',     label: '术语' },
  { key: 'chapter',   label: '章节' }, { key: 'scene',    label: '场景' },
]

type Section = 'vault' | 'templates' | 'backup' | 'export'

export function SettingsPage() {
  const { currentVault } = useVaultStore()
  const [section, setSection] = useState<Section>('vault')

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── 左侧导航 ── */}
      <nav className="w-44 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col py-4">
        <div className="px-4 mb-3">
          <span className="section-label">设置</span>
        </div>
        {([
          { key: 'vault',     label: '仓库信息' },
          { key: 'templates', label: '模板管理' },
          { key: 'backup',    label: '备份恢复' },
          { key: 'export',    label: '导出' },
        ] as { key: Section; label: string }[]).map(item => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            className="flex items-center gap-2 px-4 py-2 text-xs text-left transition-colors"
            style={{
              color:      section === item.key ? 'var(--color-accent)' : 'var(--color-muted2)',
              background: section === item.key ? 'rgba(232,160,32,0.07)' : 'transparent',
              borderLeft: section === item.key ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}>
            {item.label}
          </button>
        ))}
      </nav>

      {/* ── 右侧内容 ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {section === 'vault'     && <VaultSection vault={currentVault} />}
        {section === 'templates' && <TemplatesSection vaultId={currentVault?.id} />}
        {section === 'backup'    && <BackupSection vaultId={currentVault?.id} />}
        {section === 'export'    && <ExportSection vault={currentVault} />}
      </div>
    </div>
  )
}

/* ── 仓库信息 ── */
function VaultSection({ vault }: { vault: any }) {
  if (!vault) return <p className="text-xs text-[var(--color-muted)]">未打开仓库</p>
  return (
    <div className="max-w-lg space-y-6">
      <SectionTitle title="仓库信息" />
      <div className="card p-4 space-y-3">
        <DataRow label="名称"   value={vault.name} />
        <DataRow label="路径"   value={vault.rootPath} mono />
        <DataRow label="版本"   value={vault.version} mono />
        <DataRow label="创建于" value={new Date(vault.createdAt).toLocaleString('zh-CN')} />
        <DataRow label="更新于" value={new Date(vault.updatedAt).toLocaleString('zh-CN')} />
      </div>
    </div>
  )
}

/* ── 模板管理 ── */
function TemplatesSection({ vaultId }: { vaultId?: string }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected,  setSelected]  = useState<Template | null>(null)
  const [dirty,     setDirty]     = useState(false)

  const load = () => window.api.template.list().then(setTemplates)
  useEffect(() => { load() }, [])

  const handleSelect = (t: Template) => { setSelected({ ...t }); setDirty(false) }

  const handleSave = async () => {
    if (!selected) return
    await window.api.template.update(selected.id, {
      name:            selected.name,
      contentTemplate: selected.contentTemplate,
      fields:          selected.fields,
    })
    setDirty(false)
    load()
  }

  const handleAddField = () => {
    if (!selected) return
    const newField: FieldDefinition = {
      id: uuidv4(), name: '新字段', key: `field_${Date.now()}`,
      type: 'text', order: selected.fields.length, hidden: false,
    }
    setSelected({ ...selected, fields: [...selected.fields, newField] })
    setDirty(true)
  }

  const handleRemoveField = (fieldId: string) => {
    if (!selected) return
    setSelected({ ...selected, fields: selected.fields.filter(f => f.id !== fieldId) })
    setDirty(true)
  }

  const handleFieldChange = (fieldId: string, patch: Partial<FieldDefinition>) => {
    if (!selected) return
    setSelected({
      ...selected,
      fields: selected.fields.map(f => f.id === fieldId ? { ...f, ...patch } : f),
    })
    setDirty(true)
  }

  return (
    <div className="flex gap-4 h-full max-h-[calc(100vh-120px)]">
      {/* 模板列表 */}
      <div className="w-44 shrink-0 space-y-1">
        <SectionTitle title="模板列表" />
        {templates.map(t => (
          <button
            key={t.id}
            onClick={() => handleSelect(t)}
            className="w-full text-left px-3 py-2 text-xs transition-colors"
            style={{
              color:      selected?.id === t.id ? 'var(--color-accent)' : 'var(--color-muted2)',
              background: selected?.id === t.id ? 'rgba(232,160,32,0.08)' : 'transparent',
              borderLeft: selected?.id === t.id ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
            }}>
            <div className="font-medium">{t.name}</div>
            <div className="text-[10px] font-mono text-[var(--color-muted)] mt-0.5">
              {ENTITY_TYPES.find(e => e.key === t.entityType)?.label ?? t.entityType}
              &nbsp;· {t.fields.length} 字段
            </div>
          </button>
        ))}
      </div>

      {/* 字段编辑区 */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-32 text-xs text-[var(--color-muted)]">
            ← 选择模板编辑字段
          </div>
        ) : (
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <div>
                <SectionTitle title={selected.name} />
                <span className="text-[10px] font-mono text-[var(--color-muted)]">
                  {ENTITY_TYPES.find(e => e.key === selected.entityType)?.label}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddField} className="btn-cyan text-xs py-1 px-3">+ 添加字段</button>
                {dirty && <button onClick={handleSave} className="btn-primary text-xs py-1 px-3">保存</button>}
              </div>
            </div>

            {/* 内容模板 */}
            <div className="space-y-1.5">
              <div className="section-label">内容模板</div>
              <textarea
                className="input text-xs py-1.5 px-2 font-mono resize-none w-full"
                rows={6}
                value={selected.contentTemplate}
                onChange={e => { setSelected({ ...selected, contentTemplate: e.target.value }); setDirty(true) }}
                placeholder="新建节点时预填的 Markdown 内容…"
              />
              <p className="text-[10px] text-[var(--color-muted)] font-mono">新建该类型节点时自动预填此内容</p>
            </div>

            <div className="space-y-2">
              {selected.fields.length === 0 && (
                <p className="text-xs text-[var(--color-muted)] italic font-mono">// 暂无自定义字段</p>
              )}
              {selected.fields.map((f, idx) => (
                <div key={f.id} className="card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--color-muted)] w-5">{idx + 1}</span>
                    <input
                      className="input flex-1 text-xs py-1"
                      value={f.name}
                      onChange={e => handleFieldChange(f.id, { name: e.target.value })}
                      placeholder="字段名称"
                    />
                    <input
                      className="input w-28 text-xs py-1 font-mono"
                      value={f.key}
                      onChange={e => handleFieldChange(f.id, { key: e.target.value })}
                      placeholder="key"
                    />
                    <select
                      className="input w-28 text-xs py-1"
                      value={f.type}
                      onChange={e => handleFieldChange(f.id, { type: e.target.value as any })}>
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => handleRemoveField(f.id)}
                      className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 px-1.5 py-1 text-xs transition-colors">
                      ✕
                    </button>
                  </div>
                  {(f.type === 'select' || f.type === 'multiselect') && (
                    <div className="pl-7">
                      <OptionsInput
                        options={f.options ?? []}
                        onChange={opts => handleFieldChange(f.id, { options: opts })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── 备份恢复 ── */
function BackupSection({ vaultId }: { vaultId?: string }) {
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [creating,  setCreating]  = useState(false)
  const [note,      setNote]      = useState('')
  const [msg,       setMsg]       = useState('')

  const load = async () => {
    if (!vaultId) return
    const list = await window.api.backup.list(vaultId)
    setSnapshots(list)
  }
  useEffect(() => { load() }, [vaultId])

  const handleCreate = async () => {
    if (!vaultId) return
    setCreating(true)
    try {
      const result = await window.api.backup.create(vaultId, note || undefined)
      setMsg(`已创建快照，共 ${result.snapshotCount} 个节点`)
      setNote('')
      await load()
    } catch (e: any) {
      setMsg(`创建失败：${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (createdAt: string) => {
    if (!confirm('恢复此快照将覆盖当前数据，确认继续？')) return
    const result = await window.api.backup.restore(createdAt)
    setMsg(`已恢复快照，共恢复 ${result.nodeCount} 个节点`)
  }

  return (
    <div className="max-w-xl space-y-6">
      <SectionTitle title="备份恢复" />

      {/* 创建快照 */}
      <div className="card p-4 space-y-3">
        <div className="section-label">创建快照</div>
        <input
          className="input text-xs py-1.5"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="备注（可选）"
        />
        <button onClick={handleCreate} disabled={creating} className="btn-primary text-xs py-1.5 px-4">
          {creating ? '创建中…' : '创建快照'}
        </button>
        {!msg.includes('导出') && msg && (
          <p className="text-xs font-mono" style={{ color: msg.includes('失败') ? 'var(--color-danger)' : 'var(--color-success)' }}>{msg}</p>
        )}
      </div>

      {/* 快照列表 */}
      <div className="space-y-2">
        <div className="section-label">快照历史</div>
        {snapshots.length === 0 && (
          <p className="text-xs text-[var(--color-muted)] italic font-mono">// 暂无快照</p>
        )}
        {snapshots.map((s: any) => (
          <div key={s.created_at} className="card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--color-text)] font-mono">
                {new Date(s.created_at).toLocaleString('zh-CN')}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-[var(--color-muted2)]">{s.node_count} 个节点</span>
                {s.note && <span className="text-[10px] text-[var(--color-muted)]">· {s.note}</span>}
              </div>
            </div>
            <button
              onClick={() => handleRestore(s.created_at)}
              className="btn-danger text-[10px] py-0.5 px-2 shrink-0">
              恢复
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 导出 ── */
function ExportSection({ vault }: { vault: any }) {
  const [msg,      setMsg]      = useState('')
  const [working,  setWorking]  = useState(false)

  const run = async (task: () => Promise<string>) => {
    setWorking(true)
    setMsg('')
    try {
      setMsg(await task())
    } catch (e: any) {
      setMsg(`失败：${e.message}`)
    } finally {
      setWorking(false)
    }
  }

  const handleMdDir = () => run(async () => {
    const dir = await window.api.dialog.openDir()
    if (!dir) return ''
    const result = await window.api.backup.exportVault(vault.id, dir)
    return `已导出 ${result.exported} / ${result.total} 个节点到目录`
  })

  const handleMdZip = () => run(async () => {
    const dest = await window.api.dialog.saveFile({
      title:      '保存 ZIP 文件',
      defaultPath: `${vault.name ?? 'lorenest'}-export.zip`,
      filters:    [{ name: 'ZIP', extensions: ['zip'] }],
    })
    if (!dest) return ''
    const result = await window.api.export.mdZip(vault.id, dest)
    return `已打包 ${result.exported} 个节点 → ${result.path}`
  })

  const handleJson = () => run(async () => {
    const dest = await window.api.dialog.saveFile({
      title:      '保存 JSON 文件',
      defaultPath: `${vault.name ?? 'lorenest'}-export.json`,
      filters:    [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!dest) return ''
    const result = await window.api.export.json(vault.id, dest)
    return `已导出 ${result.nodes} 节点 · ${result.relations} 关系 → ${result.path}`
  })

  if (!vault) return <p className="text-xs text-[var(--color-muted)]">未打开仓库</p>

  return (
    <div className="max-w-xl space-y-5">
      <SectionTitle title="导出" />

      {/* Markdown 目录 */}
      <ExportCard
        title="导出为 Markdown 文件夹"
        desc="将所有节点导出为带 YAML 前置信息的 .md 文件，写入指定目录，保留文件夹结构。"
        badge="目录"
        badgeColor="var(--color-accent2)"
        onAction={handleMdDir}
        working={working}
      />

      {/* Markdown ZIP */}
      <ExportCard
        title="导出为 Markdown ZIP"
        desc="将所有节点打包为单个 .zip 文件，内含 Markdown 文件和 README，便于传输与分享。"
        badge="ZIP"
        badgeColor="var(--color-accent)"
        onAction={handleMdZip}
        working={working}
      />

      {/* JSON */}
      <ExportCard
        title="导出为 JSON"
        desc="以结构化 JSON 格式导出完整数据：节点、文件夹、具名关系、模板，适合程序处理或备份迁移。"
        badge="JSON"
        badgeColor="var(--color-success)"
        onAction={handleJson}
        working={working}
      />

      {msg && (
        <p className="text-xs font-mono px-1"
          style={{ color: msg.startsWith('失败') ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {msg}
        </p>
      )}
    </div>
  )
}

function ExportCard({
  title, desc, badge, badgeColor, onAction, working,
}: {
  title: string; desc: string; badge: string
  badgeColor: string; onAction: () => void; working: boolean
}) {
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: badgeColor }} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[9px] font-mono px-1.5 py-0.5"
              style={{
                color:      badgeColor,
                border:     `1px solid ${badgeColor}55`,
                background: `${badgeColor}12`,
                clipPath:   'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
              }}>
              {badge}
            </span>
            <span className="text-xs font-semibold text-[var(--color-text)]">{title}</span>
          </div>
          <p className="text-[11px] text-[var(--color-muted)] font-mono leading-relaxed">{desc}</p>
        </div>
        <button
          onClick={onAction}
          disabled={working}
          className="shrink-0 text-[10px] font-mono px-3 py-1.5 transition-colors disabled:opacity-40"
          style={{
            color:      badgeColor,
            border:     `1px solid ${badgeColor}60`,
            background: `${badgeColor}0e`,
            clipPath:   'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
          }}>
          {working ? '处理中…' : '导出'}
        </button>
      </div>
    </div>
  )
}

/* ── 选项输入（用本地 state，blur 时才解析，避免逗号被实时吃掉）── */
function OptionsInput({ options, onChange }: { options: string[]; onChange: (v: string[]) => void }) {
  const [raw, setRaw] = useState(options.join(', '))
  const committed = useRef(options.join(', '))

  // 当外部 options 发生跨字段变化时同步
  useEffect(() => {
    const joined = options.join(', ')
    if (joined !== committed.current) {
      setRaw(joined)
      committed.current = joined
    }
  }, [options.join(',')])

  const commit = () => {
    const parsed = raw.split(',').map(s => s.trim()).filter(Boolean)
    committed.current = parsed.join(', ')
    onChange(parsed)
  }

  return (
    <>
      <input
        className="input text-xs py-1"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
        placeholder="选项1, 选项2, 选项3"
      />
      <p className="text-[10px] text-[var(--color-muted)] mt-1 font-mono">逗号分隔，回车或失焦保存</p>
    </>
  )
}

/* ── 工具组件 ── */
function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold text-[var(--color-text)]">{title}</h2>
      <div className="deco-line mt-1" />
    </div>
  )
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="section-label w-14 shrink-0 pt-0.5">{label}</span>
      <span className={`text-xs text-[var(--color-text)] break-all selectable ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}
