import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate }       from 'react-router-dom'
import type { AnyNode }                 from '@shared/types'

const TYPE_ACCENT: Record<string, string> = {
  event:     '#ff9800',
  character: '#e8a020',
  location:  '#4caf50',
  faction:   '#00c8e8',
  item:      '#ffeb3b',
  term:      '#00bcd4',
  chapter:   '#e91e63',
  scene:     '#f44336',
  document:  '#5a6080',
}

const STATUS_LABEL: Record<string, string> = {
  canon: '正典', draft: '草稿', archived: '归档', discarded: '废弃',
}
const STATUS_BADGE: Record<string, string> = {
  canon: 'badge-green', draft: 'badge-muted', archived: 'badge-amber', discarded: 'badge-red',
}

const ALL_TYPES = ['event', 'character', 'location', 'faction', 'item', 'term', 'chapter', 'scene', 'document']

export function TimelinePage() {
  const { vaultId } = useParams<{ vaultId: string }>()
  const navigate    = useNavigate()

  const [nodes,       setNodes]       = useState<AnyNode[]>([])
  const [loading,     setLoading]     = useState(false)
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set(['event']))
  const [sortAsc,     setSortAsc]     = useState(true)

  useEffect(() => {
    if (!vaultId) return
    setLoading(true)
    window.api.node.list({ vaultId }).then(ns => {
      setNodes(ns)
      setLoading(false)
    })
  }, [vaultId])

  const filtered = useMemo(() => {
    let result = typeFilters.size === 0
      ? nodes
      : nodes.filter(n => typeFilters.has(n.type))

    return [...result].sort((a, b) => {
      // Try to use a date field first, fallback to createdAt
      const getDate = (n: AnyNode) => {
        const fields = (n as any).fields
        if (fields?.date) return String(fields.date)
        if (fields?.start_date) return String(fields.start_date)
        return n.createdAt
      }
      const da = getDate(a)
      const db = getDate(b)
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da)
    })
  }, [nodes, typeFilters, sortAsc])

  const toggleType = (type: string) => {
    setTypeFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── 顶部工具栏 ── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 flex-wrap">
        <div className="w-0.5 h-5 bg-[var(--color-accent)] shrink-0" />
        <span className="text-sm font-bold text-[var(--color-text)]">时间线</span>

        {/* 类型筛选 */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setTypeFilters(new Set())}
            className="text-[10px] font-mono px-2 py-0.5 transition-colors"
            style={{
              color:      typeFilters.size === 0 ? 'var(--color-bg)' : 'var(--color-muted)',
              background: typeFilters.size === 0 ? 'var(--color-accent)' : 'transparent',
              border:     `1px solid ${typeFilters.size === 0 ? 'var(--color-accent)' : 'var(--color-border2)'}`,
            }}>
            ALL
          </button>
          {ALL_TYPES.map(t => {
            const active = typeFilters.has(t)
            const accent = TYPE_ACCENT[t] ?? 'var(--color-accent)'
            return (
              <button key={t}
                onClick={() => toggleType(t)}
                className="text-[10px] font-mono px-2 py-0.5 transition-colors"
                style={{
                  color:      active ? 'var(--color-bg)' : 'var(--color-muted)',
                  background: active ? accent : 'transparent',
                  border:     `1px solid ${active ? accent : 'var(--color-border2)'}`,
                }}>
                {t === 'event' ? '事件' : t === 'character' ? '角色' : t === 'location' ? '地点' :
                 t === 'faction' ? '势力' : t === 'item' ? '物品' : t === 'term' ? '术语' :
                 t === 'chapter' ? '章节' : t === 'scene' ? '场景' : '文档'}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--color-muted)]">{filtered.length} 项</span>
          <button
            onClick={() => setSortAsc(v => !v)}
            className="text-[10px] font-mono px-2 py-0.5 border border-[var(--color-border2)] text-[var(--color-muted2)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors">
            {sortAsc ? '↑ 正序' : '↓ 倒序'}
          </button>
        </div>
      </div>

      <div className="deco-line shrink-0" />

      {/* ── 时间线内容 ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] font-mono py-8">
            <div className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            LOADING…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border border-[var(--color-border2)] flex items-center justify-center">
              <div className="w-4 h-4 border border-[var(--color-muted)] border-dashed" />
            </div>
            <p className="text-xs text-[var(--color-muted)] font-mono">// 暂无匹配节点</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="relative max-w-2xl">
            {/* 时间线轴 */}
            <div className="absolute left-[7px] top-0 bottom-0 w-px"
              style={{ background: 'linear-gradient(to bottom, var(--color-accent), rgba(232,160,32,0.1))' }} />

            <div className="space-y-0">
              {filtered.map((n, i) => {
                const accent = TYPE_ACCENT[n.type] ?? 'var(--color-accent)'
                const dateVal = (n as any).fields?.date
                  ?? (n as any).fields?.start_date
                  ?? null
                return (
                  <TimelineItem
                    key={n.id}
                    node={n}
                    accent={accent}
                    dateVal={dateVal}
                    isLast={i === filtered.length - 1}
                    onClick={() => navigate(`/vault/${vaultId}/entity/${n.id}`)}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineItem({ node, accent, dateVal, isLast, onClick }: {
  node:    AnyNode
  accent:  string
  dateVal: string | null
  isLast:  boolean
  onClick: () => void
}) {
  return (
    <div className="flex gap-5 group" style={{ paddingBottom: isLast ? 0 : '1.25rem' }}>
      {/* 节点圆点 */}
      <div className="flex flex-col items-center shrink-0 mt-1" style={{ width: '15px' }}>
        <div className="w-[15px] h-[15px] border-2 shrink-0 transition-all group-hover:scale-110"
          style={{
            borderColor: accent,
            background: `${accent}22`,
            clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
          }} />
      </div>

      {/* 内容卡 */}
      <button
        onClick={onClick}
        className="flex-1 card px-4 py-3 text-left mb-0 group-hover:border-[var(--color-accent)]/40 transition-colors"
        onMouseEnter={e => (e.currentTarget.style.borderColor = accent + '60')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* 类型 + 标题 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-1 py-0.5 shrink-0"
                style={{
                  color:      accent,
                  border:     `1px solid ${accent}44`,
                  background: `${accent}0e`,
                  clipPath:   'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
                }}>
                {node.type}
              </span>
              <span className="font-semibold text-sm text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                {node.title}
              </span>
            </div>

            {/* 标签 */}
            {node.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1.5">
                {node.tags.slice(0, 4).map(t => (
                  <span key={t} className="badge-muted text-[9px]">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* 右侧信息 */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={STATUS_BADGE[node.status] ?? 'badge-muted'}>
              {STATUS_LABEL[node.status] ?? node.status}
            </span>
            <span className="text-[10px] font-mono text-[var(--color-muted)]">
              {dateVal
                ? String(dateVal)
                : new Date(node.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>

        {/* 右下角装饰 */}
        <div className="absolute bottom-0 right-0 w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: accent, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      </button>
    </div>
  )
}
