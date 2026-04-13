import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useVaultStore }  from '../../stores/vault.store'
import { useEditorStore } from '../../stores/editor.store'
import { invalidateNodeTitleCache } from '../../components/editor/WikiLinkPlugin'
import type { AnyNode, EntityType, FieldValue, NodeStatus } from '@shared/types'

const BATCH_STATUS_OPTIONS: { value: NodeStatus; label: string }[] = [
  { value: 'canon',     label: '正典' },
  { value: 'draft',     label: '草稿' },
  { value: 'archived',  label: '归档' },
  { value: 'discarded', label: '废弃' },
]

const ENTITY_TYPES: { key: EntityType | 'all'; label: string }[] = [
  { key: 'all',       label: 'ALL' },
  { key: 'character', label: '角色' },
  { key: 'location',  label: '地点' },
  { key: 'faction',   label: '势力' },
  { key: 'event',     label: '事件' },
  { key: 'item',      label: '物品' },
  { key: 'term',      label: '术语' },
  { key: 'chapter',   label: '章节' },
  { key: 'scene',     label: '场景' },
  { key: 'document',  label: '文档' },
]

const TYPE_ACCENT: Record<string, string> = {
  character: '#e8a020',
  location:  '#4caf50',
  faction:   '#00c8e8',
  event:     '#ff9800',
  item:      '#ffeb3b',
  term:      '#00bcd4',
  chapter:   '#e91e63',
  scene:     '#f44336',
  document:  '#5a6080',
}

const STATUS_STYLE: Record<string, string> = {
  canon:     'badge-green',
  draft:     'badge-muted',
  archived:  'badge-amber',
  discarded: 'badge-red',
}

const STATUS_LABELS: Record<string, string> = {
  canon: '正典', draft: '草稿', archived: '归档', discarded: '废弃',
}

export function WorkspacePage() {
  const { vaultId }     = useParams<{ vaultId: string }>()
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const { currentVault } = useVaultStore()
  const { setActiveNode } = useEditorStore()

  const [nodes,       setNodes]       = useState<AnyNode[]>([])
  const [typeFilter,  setTypeFilter]  = useState<EntityType | 'all'>('all')
  const [tagFilter,   setTagFilter]   = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [newTitle,    setNewTitle]    = useState('')
  const [newType,     setNewType]     = useState<EntityType>('document')
  const [batchMode,   setBatchMode]   = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const folderNodeId = searchParams.get('folder') ?? undefined

  useEffect(() => {
    if (!vaultId) return
    setLoading(true)
    window.api.node.list({
      vaultId,
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      ...(folderNodeId ? { folderNodeId } : {}),
    }).then(ns => { setNodes(ns); setLoading(false) })
  }, [vaultId, typeFilter, folderNodeId])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBatchStatus = async (status: NodeStatus) => {
    await Promise.all([...selectedIds].map(id => window.api.node.update(id, { status })))
    setNodes(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, status } : n))
    setSelectedIds(new Set())
    setBatchMode(false)
  }

  const handleBatchDelete = async () => {
    if (!confirm(`确认删除选中的 ${selectedIds.size} 个节点？`)) return
    await Promise.all([...selectedIds].map(id => window.api.node.delete(id)))
    setNodes(prev => prev.filter(n => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
    setBatchMode(false)
  }

  const handleCreate = async () => {
    if (!newTitle.trim() || !vaultId) return
    // Apply template defaults on creation
    const template = await window.api.template.getByType(newType)
    const content = template?.contentTemplate ?? ''
    const fields: Record<string, FieldValue> = {}
    if (template?.fields) {
      for (const f of template.fields) {
        if (f.defaultValue !== undefined && f.defaultValue !== null) fields[f.key] = f.defaultValue as FieldValue
      }
    }
    const node = await window.api.node.create({
      vaultId,
      title: newTitle.trim(),
      type: newType,
      content,
      fields,
      ...(folderNodeId ? { folderNodeId } : {}),
    })
    invalidateNodeTitleCache()   // 新节点加入，让双链缓存下次重建
    setCreating(false)
    setNewTitle('')
    navigate(`/vault/${vaultId}/entity/${node.id}`)
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── 工具栏 ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        {/* 类型筛选 */}
        <div className="flex gap-1 flex-wrap items-center">
          {ENTITY_TYPES.map(t => {
            const isActive = typeFilter === t.key
            const accentColor = TYPE_ACCENT[t.key] ?? 'var(--color-accent)'
            return (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key as any)}
                className="px-2.5 py-0.5 text-[11px] transition-all"
                style={{
                  fontFamily:    'var(--font-mono)',
                  letterSpacing: '0.06em',
                  fontWeight:    isActive ? 600 : 400,
                  color:         isActive ? accentColor : 'var(--color-text-dim)',
                  background:    isActive ? `${accentColor}18` : 'transparent',
                  border:        isActive
                    ? `1px solid ${accentColor}88`
                    : '1px solid var(--color-border2)',
                  clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
                  opacity: isActive ? 1 : 0.75,
                }}>
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--color-muted)]">
            {nodes.length} 个节点
          </span>
          <button
            onClick={() => { setBatchMode(v => !v); setSelectedIds(new Set()) }}
            className={batchMode ? 'btn-cyan text-xs py-1 px-3' : 'btn-ghost text-xs py-1 px-3'}>
            {batchMode ? `已选 ${selectedIds.size}` : '批量'}
          </button>
          {!batchMode && (
            <button onClick={() => setCreating(v => !v)} className="btn-primary text-xs py-1 px-3">
              ＋ 新建
            </button>
          )}
        </div>
      </div>

      {/* ── 新建表单 ── */}
      {creating && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface2)] shrink-0">
          <div className="w-0.5 h-5 bg-[var(--color-accent)]" />
          <input
            autoFocus
            className="input flex-1 text-xs py-1"
            placeholder="节点标题"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <select
            className="input w-24 text-xs py-1"
            value={newType}
            onChange={e => setNewType(e.target.value as EntityType)}>
            {ENTITY_TYPES.filter(t => t.key !== 'all').map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <button onClick={handleCreate}     className="btn-primary text-xs py-1 px-3">创建</button>
          <button onClick={() => setCreating(false)} className="btn-ghost  text-xs py-1 px-2">✕</button>
        </div>
      )}

      {/* ── 节点列表 ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] font-mono py-6">
            <div className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            LOADING…
          </div>
        )}

        {!loading && nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-8 h-8 border border-[var(--color-border2)] flex items-center justify-center">
              <div className="w-3 h-3 border border-[var(--color-muted)] border-dashed" />
            </div>
            <p className="text-xs text-[var(--color-muted)] font-mono">// 暂无内容</p>
            <button onClick={() => setCreating(true)} className="btn-ghost text-xs">
              ＋ 新建第一个节点
            </button>
          </div>
        )}

        {/* tag 筛选提示条 */}
        {tagFilter && (
          <div className="flex items-center gap-2 mb-3 max-w-3xl">
            <span className="text-[10px] font-mono text-[var(--color-muted)]">标签筛选：</span>
            <span className="badge-amber">{tagFilter}</span>
            <button
              onClick={() => setTagFilter(null)}
              className="text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors">
              ✕ 清除
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 max-w-3xl">
          {(tagFilter ? nodes.filter(n => n.tags.includes(tagFilter)) : nodes).map(n => (
            <NodeCard key={n.id} node={n}
              batchMode={batchMode}
              selected={selectedIds.has(n.id)}
              onSelect={() => toggleSelect(n.id)}
              onTagClick={tag => setTagFilter(tag)}
              onClick={() => {
                if (batchMode) { toggleSelect(n.id); return }
                setActiveNode(n)
                navigate(`/vault/${vaultId}/entity/${n.id}`)
              }} />
          ))}
        </div>
      </div>

      {/* ── 批量操作栏 ── */}
      {batchMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <span className="text-[10px] font-mono text-[var(--color-accent)]">
            已选 {selectedIds.size} 个节点
          </span>
          <div className="flex gap-1">
            {BATCH_STATUS_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => handleBatchStatus(opt.value)}
                className="text-[10px] font-mono px-2 py-0.5 border border-[var(--color-border2)] text-[var(--color-muted2)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors">
                → {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleBatchDelete}
            className="btn-danger text-[10px] py-0.5 px-2 ml-auto">
            删除选中
          </button>
        </div>
      )}
    </div>
  )
}

function NodeCard({ node, onClick, batchMode, selected, onSelect, onTagClick }: {
  node:        AnyNode
  onClick:     () => void
  batchMode?:  boolean
  selected?:   boolean
  onSelect?:   () => void
  onTagClick?: (tag: string) => void
}) {
  const accent = TYPE_ACCENT[node.type] ?? 'var(--color-muted)'
  return (
    <button
      onClick={onClick}
      className="card px-4 py-3 text-left group w-full relative"
      style={{
        '--hover-accent': accent,
        borderColor: selected ? accent + 'aa' : 'var(--color-border)',
        background: selected ? `${accent}08` : undefined,
      } as any}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = accent + '80' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--color-border)' }}>

      <div className="flex items-start gap-3">
        {/* 批量模式复选框 */}
        {batchMode && (
          <div className="shrink-0 mt-0.5 w-4 h-4 border flex items-center justify-center transition-colors"
            style={{
              borderColor: selected ? accent : 'var(--color-border2)',
              background:  selected ? accent : 'transparent',
              clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
            }}>
            {selected && <span className="text-black text-[10px] font-bold leading-none">✓</span>}
          </div>
        )}
        {/* 类型色条 */}
        {!batchMode && <div className="w-0.5 h-full shrink-0 self-stretch mt-0.5" style={{ background: accent + '80' }} />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-mono px-1 py-0.5"
              style={{
                color: accent,
                border: `1px solid ${accent}44`,
                background: `${accent}0e`,
                clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
              }}>
              {ENTITY_TYPES.find(t => t.key === node.type)?.label ?? node.type}
            </span>
            <span className="font-medium text-sm text-[var(--color-text)] truncate group-hover:text-[var(--color-text)]">
              {node.title}
            </span>
          </div>

          {node.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {node.tags.slice(0, 5).map(t => (
                <span
                  key={t}
                  className="badge-muted cursor-pointer hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                  onClick={e => { e.stopPropagation(); onTagClick?.(t) }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={STATUS_STYLE[node.status] ?? 'badge-muted'}>
            {STATUS_LABELS[node.status] ?? node.status}
          </span>
          <span className="text-[10px] font-mono text-[var(--color-muted)]">
            {new Date(node.updatedAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </button>
  )
}
