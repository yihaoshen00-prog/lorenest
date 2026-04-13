import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate }       from 'react-router-dom'
import type { AnyNode, EntityType, FieldDefinition, NodeStatus, Template } from '@shared/types'

const TYPE_LABELS: Record<string, string> = {
  character: '角色', location: '地点', faction: '势力', event: '事件',
  item: '物品', term: '术语', chapter: '章节', scene: '场景',
}

const TYPE_COLOR: Record<string, string> = {
  character: '#e8a020', location: '#4caf50', faction: '#00c8e8', event: '#ff9800',
  item: '#ffeb3b',      term: '#00bcd4',    chapter: '#e91e63', scene: '#f44336',
}

const STATUS_OPTIONS: NodeStatus[] = ['draft', 'canon', 'archived', 'discarded']
const STATUS_LABELS: Record<string, string> = {
  canon: '正典', draft: '草稿', archived: '归档', discarded: '废弃',
}
const STATUS_BADGE: Record<string, string> = {
  canon: 'badge-green', draft: 'badge-muted', archived: 'badge-amber', discarded: 'badge-red',
}

export function DatabasePage() {
  const { vaultId, type } = useParams<{ vaultId: string; type: string }>()
  const navigate           = useNavigate()

  const [nodes,    setNodes]    = useState<AnyNode[]>([])
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState<NodeStatus | 'all'>('all')
  const [sortKey,  setSortKey]  = useState<'title' | 'updatedAt' | 'status'>('updatedAt')
  const [sortAsc,  setSortAsc]  = useState(false)

  // 加载节点与模板
  useEffect(() => {
    if (!vaultId || !type) return
    setLoading(true)
    Promise.all([
      window.api.node.list({ vaultId, type: type as EntityType }),
      window.api.template.getByType(type as EntityType),
    ]).then(([ns, tpl]) => {
      setNodes(ns)
      setTemplate(tpl)
      setLoading(false)
    })
  }, [vaultId, type])

  // 字段定义（最多展示前 4 个可见字段）
  const fieldDefs: FieldDefinition[] = useMemo(
    () => (template?.fields ?? []).filter(f => !f.hidden).sort((a, b) => a.order - b.order).slice(0, 4),
    [template]
  )

  // 过滤 + 排序
  const filtered = useMemo(() => {
    let result = nodes
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(n => n.title.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)))
    }
    if (statusFilter !== 'all') result = result.filter(n => n.status === statusFilter)
    result = [...result].sort((a, b) => {
      let va: string, vb: string
      if (sortKey === 'title')     { va = a.title;     vb = b.title }
      else if (sortKey === 'status') { va = a.status;   vb = b.status }
      else                          { va = a.updatedAt; vb = b.updatedAt }
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return result
  }, [nodes, search, statusFilter, sortKey, sortAsc])

  const accent = TYPE_COLOR[type ?? ''] ?? 'var(--color-accent)'

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  const handleStatusChange = async (nodeId: string, status: NodeStatus) => {
    await window.api.node.update(nodeId, { status })
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status } : n))
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── 顶部标题栏 ── */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <div className="w-0.5 h-5 shrink-0" style={{ background: accent }} />
        <h1 className="text-base font-bold" style={{ color: accent }}>
          {TYPE_LABELS[type ?? ''] ?? type}
        </h1>
        <span className="text-xs font-mono text-[var(--color-muted)]">{filtered.length} / {nodes.length}</span>

        {/* 搜索 */}
        <input
          className="input text-xs py-1 px-3 w-52"
          placeholder="搜索标题、标签…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* 状态筛选 */}
        <div className="flex gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className="text-[10px] font-mono px-2 py-0.5 transition-colors"
            style={{
              color:      statusFilter === 'all' ? 'var(--color-bg)' : 'var(--color-muted)',
              background: statusFilter === 'all' ? accent : 'transparent',
              border:     `1px solid ${statusFilter === 'all' ? accent : 'var(--color-border2)'}`,
            }}>
            ALL
          </button>
          {STATUS_OPTIONS.map(s => (
            <button key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className="text-[10px] font-mono px-2 py-0.5 transition-colors"
              style={{
                color:      statusFilter === s ? 'var(--color-bg)' : 'var(--color-muted)',
                background: statusFilter === s ? accent : 'transparent',
                border:     `1px solid ${statusFilter === s ? accent : 'var(--color-border2)'}`,
              }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <button
            onClick={async () => {
              if (!vaultId) return
              const node = await window.api.node.create({ vaultId, title: '新' + (TYPE_LABELS[type ?? ''] ?? '节点'), type: type as EntityType })
              navigate(`/vault/${vaultId}/entity/${node.id}`)
            }}
            className="btn-primary text-xs py-1 px-3">
            ＋ 新建
          </button>
        </div>
      </div>

      <div className="deco-line shrink-0" />

      {/* ── 表格 ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] font-mono p-6">
            <div className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            LOADING…
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--color-surface)]">
              <tr className="border-b border-[var(--color-border2)]">
                <SortTh label="标题"  sortKey="title"     current={sortKey} asc={sortAsc} onClick={handleSort} width="30%" />
                <SortTh label="状态"  sortKey="status"    current={sortKey} asc={sortAsc} onClick={handleSort} width="80px" />
                {fieldDefs.map(f => (
                  <th key={f.id} className="text-left py-2 px-3 section-label font-medium" style={{ width: '120px' }}>
                    {f.name}
                  </th>
                ))}
                <th className="text-left py-2 px-3 section-label" style={{ width: '60px' }}>标签</th>
                <SortTh label="更新"  sortKey="updatedAt" current={sortKey} asc={sortAsc} onClick={handleSort} width="90px" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4 + fieldDefs.length + 1}
                    className="py-12 text-center text-xs text-[var(--color-muted)] font-mono italic">
                    // 暂无数据
                  </td>
                </tr>
              )}
              {filtered.map(n => (
                <tr key={n.id}
                  className="border-b border-[var(--color-border)] transition-colors group cursor-pointer"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${accent}09`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => navigate(`/vault/${vaultId}/entity/${n.id}`)}>

                  {/* 标题 */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-0.5 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: accent }} />
                      <span className="font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                        {n.title}
                      </span>
                    </div>
                  </td>

                  {/* 状态（内联切换，阻止行跳转） */}
                  <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                    <select
                      className={`${STATUS_BADGE[n.status] ?? 'badge-muted'} cursor-pointer border-none outline-none bg-transparent`}
                      value={n.status}
                      onChange={e => handleStatusChange(n.id, e.target.value as NodeStatus)}
                      style={{ appearance: 'none', WebkitAppearance: 'none' }}>
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s} style={{ background: '#141726', color: '#e8e4d5' }}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* 自定义字段值 */}
                  {fieldDefs.map(f => {
                    const val = (n as any).fields?.[f.key]
                    return (
                      <td key={f.id} className="py-2 px-3 text-xs text-[var(--color-muted2)] font-mono truncate max-w-[120px]">
                        {renderFieldCell(val, f)}
                      </td>
                    )
                  })}

                  {/* 标签 */}
                  <td className="py-2 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {n.tags.slice(0, 2).map(t => (
                        <span key={t} className="badge-muted text-[9px]">{t}</span>
                      ))}
                    </div>
                  </td>

                  {/* 更新时间 */}
                  <td className="py-2 px-3 text-[10px] font-mono text-[var(--color-muted)]">
                    {new Date(n.updatedAt).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ── 可排序表头 ── */
function SortTh({ label, sortKey, current, asc, onClick, width }: {
  label:   string
  sortKey: 'title' | 'updatedAt' | 'status'
  current: string
  asc:     boolean
  onClick: (k: any) => void
  width?:  string
}) {
  const active = current === sortKey
  return (
    <th
      className="text-left py-2 px-3 section-label font-medium cursor-pointer select-none hover:text-[var(--color-muted2)] transition-colors"
      style={{ width }}
      onClick={() => onClick(sortKey)}>
      {label}
      {active && <span className="ml-1 text-[var(--color-accent)]">{asc ? '↑' : '↓'}</span>}
    </th>
  )
}

/* ── 字段值单元格渲染 ── */
function renderFieldCell(val: any, def: FieldDefinition): string {
  if (val === null || val === undefined || val === '') return '—'
  if (def.type === 'boolean')     return val ? '是' : '否'
  if (def.type === 'tags' || def.type === 'multiselect' || def.type === 'reference_list') {
    return Array.isArray(val) ? val.slice(0, 2).join(', ') : String(val)
  }
  return String(val)
}
