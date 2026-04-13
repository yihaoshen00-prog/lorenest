import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AnyNode, NodeStatus } from '@shared/types'

const TYPE_META: { key: string; label: string; color: string }[] = [
  { key: 'character', label: '角色',  color: '#e8a020' },
  { key: 'location',  label: '地点',  color: '#4caf50' },
  { key: 'faction',   label: '势力',  color: '#00c8e8' },
  { key: 'event',     label: '事件',  color: '#ff9800' },
  { key: 'item',      label: '物品',  color: '#ffeb3b' },
  { key: 'term',      label: '术语',  color: '#00bcd4' },
  { key: 'chapter',   label: '章节',  color: '#e91e63' },
  { key: 'scene',     label: '场景',  color: '#f44336' },
  { key: 'document',  label: '文档',  color: '#5a6080' },
]

const STATUS_META: { key: NodeStatus; label: string; color: string }[] = [
  { key: 'canon',     label: '正典', color: '#4caf50' },
  { key: 'draft',     label: '草稿', color: '#5a6080' },
  { key: 'archived',  label: '归档', color: '#e8a020' },
  { key: 'discarded', label: '废弃', color: '#f44336' },
]

export function StatsPage() {
  const { vaultId } = useParams<{ vaultId: string }>()
  const [nodes,   setNodes]   = useState<AnyNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vaultId) return
    window.api.node.list({ vaultId }).then(ns => { setNodes(ns); setLoading(false) })
  }, [vaultId])

  const byType = useMemo(() => {
    const map: Record<string, number> = {}
    nodes.forEach(n => { map[n.type] = (map[n.type] ?? 0) + 1 })
    return map
  }, [nodes])

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {}
    nodes.forEach(n => { map[n.status] = (map[n.status] ?? 0) + 1 })
    return map
  }, [nodes])

  const totalWords = useMemo(() =>
    nodes.reduce((acc, n) => acc + ((n as any).content?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0)
  , [nodes])

  const maxTypeCount   = Math.max(...TYPE_META.map(t => byType[t.key] ?? 0), 1)
  const maxStatusCount = Math.max(...STATUS_META.map(s => byStatus[s.key] ?? 0), 1)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">

        {/* ── 标题 ── */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-0.5 h-6 bg-[var(--color-accent)]" />
            <h1 className="text-lg font-bold text-[var(--color-text)]">仓库统计</h1>
          </div>
          <div className="deco-line" />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] font-mono py-12">
            <div className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            LOADING…
          </div>
        ) : (
          <>
            {/* ── 总览卡片 ── */}
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="节点总数" value={nodes.length} accent="var(--color-accent)" />
              <SummaryCard label="总字数"   value={totalWords.toLocaleString()} accent="var(--color-accent2)" unit="字" />
              <SummaryCard label="正典节点" value={byStatus['canon'] ?? 0}
                accent="var(--color-success)"
                sub={nodes.length > 0 ? `${Math.round(((byStatus['canon'] ?? 0) / nodes.length) * 100)}%` : '—'} />
            </div>

            {/* ── 按类型分布 ── */}
            <section className="space-y-3">
              <SectionHeader label="节点类型分布" />
              <div className="space-y-2">
                {TYPE_META.map(t => {
                  const count = byType[t.key] ?? 0
                  const pct   = Math.round((count / maxTypeCount) * 100)
                  return (
                    <div key={t.key} className="flex items-center gap-3">
                      <span className="w-10 text-[10px] font-mono text-right shrink-0"
                        style={{ color: t.color }}>{t.label}</span>
                      <div className="flex-1 h-5 bg-[var(--color-surface)] relative overflow-hidden"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}>
                        <div
                          className="h-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `${t.color}40`, borderRight: count > 0 ? `2px solid ${t.color}` : 'none' }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right shrink-0"
                        style={{ color: count > 0 ? t.color : 'var(--color-muted)' }}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── 按状态分布 ── */}
            <section className="space-y-3">
              <SectionHeader label="节点状态分布" />
              <div className="grid grid-cols-2 gap-3">
                {STATUS_META.map(s => {
                  const count = byStatus[s.key] ?? 0
                  const pct   = nodes.length > 0 ? Math.round((count / nodes.length) * 100) : 0
                  return (
                    <div key={s.key} className="card p-4 relative overflow-hidden">
                      {/* 背景色条 */}
                      <div className="absolute inset-0 opacity-5"
                        style={{ background: s.color }} />
                      <div className="relative flex items-end justify-between">
                        <div>
                          <div className="text-[10px] font-mono mb-1" style={{ color: s.color }}>{s.label}</div>
                          <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{count}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono text-[var(--color-muted)]">{pct}%</div>
                          {/* 小进度弧 */}
                          <svg width="36" height="36" viewBox="0 0 36 36" className="mt-1">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-border2)" strokeWidth="3" />
                            <circle cx="18" cy="18" r="14" fill="none"
                              stroke={s.color} strokeWidth="3"
                              strokeDasharray={`${pct * 0.879} 100`}
                              strokeLinecap="round"
                              transform="rotate(-90 18 18)"
                              style={{ transition: 'stroke-dasharray 0.7s ease' }}
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── 最近活跃 ── */}
            <section className="space-y-3">
              <SectionHeader label="最近修改" />
              <div className="space-y-1">
                {[...nodes]
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .slice(0, 8)
                  .map(n => {
                    const meta = TYPE_META.find(t => t.key === n.type)
                    return (
                      <div key={n.id} className="flex items-center gap-3 px-3 py-2 border border-transparent
                                                  hover:border-[var(--color-border)] transition-colors">
                        <span className="text-[10px] font-mono w-10 text-right shrink-0"
                          style={{ color: meta?.color }}>
                          {meta?.label ?? n.type}
                        </span>
                        <span className="flex-1 text-xs text-[var(--color-text)] truncate">{n.title}</span>
                        <span className="text-[10px] font-mono text-[var(--color-muted)] shrink-0">
                          {new Date(n.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, accent, sub, unit }: {
  label:   string
  value:   number | string
  accent:  string
  sub?:    string
  unit?:   string
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: accent }} />
      <div className="text-[10px] font-mono text-[var(--color-muted)] mb-2">{label}</div>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold font-mono" style={{ color: accent }}>{value}</span>
        {unit && <span className="text-xs text-[var(--color-muted)] mb-1 font-mono">{unit}</span>}
      </div>
      {sub && <div className="text-[10px] font-mono mt-1" style={{ color: accent }}>{sub}</div>}
      {/* 右下角装饰 */}
      <div className="absolute bottom-0 right-0 w-3 h-3" style={{
        background: accent, opacity: 0.3,
        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
      }} />
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1 h-4 rounded-sm shrink-0" style={{ background: 'var(--color-accent3)' }} />
      <span className="text-sm font-bold tracking-widest uppercase"
        style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)', letterSpacing: '0.12em' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, var(--color-border2), transparent)' }} />
    </div>
  )
}
