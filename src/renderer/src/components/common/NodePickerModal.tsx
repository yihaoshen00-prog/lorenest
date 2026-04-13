import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import type { AnyNode } from '@shared/types'

const TYPE_LABELS: Record<string, string> = {
  character: '角色', location: '地点', faction: '势力', event: '事件',
  item: '物品', term: '术语', chapter: '章节', scene: '场景', document: '文档',
}
const TYPE_COLORS: Record<string, string> = {
  character: '#e8a020', location: '#4caf50', faction: '#00c8e8',
  event: '#ff9800',     item: '#ffeb3b',     term: '#00bcd4',
  chapter: '#e91e63',   scene: '#f44336',    document: '#5a6080',
}

interface Props {
  open:          boolean
  onClose:       () => void
  onSelect:      (node: AnyNode) => void
  /** 已选中的节点标题列表（用于多选高亮） */
  selectedTitles?: string[]
}

export function NodePickerModal({ open, onClose, onSelect, selectedTitles = [] }: Props) {
  const { vaultId }  = useParams<{ vaultId: string }>()
  const inputRef     = useRef<HTMLInputElement>(null)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<AnyNode[]>([])
  const [cursor,  setCursor]  = useState(0)
  const debouncer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery(''); setResults([]); setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  const doSearch = useCallback((q: string) => {
    if (!vaultId) return
    if (debouncer.current) clearTimeout(debouncer.current)
    debouncer.current = setTimeout(async () => {
      if (!q.trim()) {
        // 空查询时返回最近节点
        const all = await window.api.node.list({ vaultId })
        setResults(all.slice(0, 30)); setCursor(0)
      } else {
        const hits = await window.api.node.search(q.trim(), { vaultId, limit: 30 })
        setResults(hits); setCursor(0)
      }
    }, 120)
  }, [vaultId])

  useEffect(() => { if (open) doSearch(query) }, [query, open, doSearch])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape')    { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) { onSelect(results[cursor]); onClose() }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32"
      style={{ background: 'rgba(10,11,20,0.7)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div
        className="w-full max-w-md bg-[var(--color-surface2)] border border-[var(--color-border2)]"
        style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>

        {/* 顶部强调线 */}
        <div className="h-px bg-[var(--color-accent2)]" />

        {/* 搜索输入 */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-accent2)] font-mono text-sm shrink-0">⌕</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)]"
            placeholder="搜索节点…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <span className="text-[10px] text-[var(--color-muted)] font-mono shrink-0">ESC 关闭</span>
        </div>

        {/* 结果列表 */}
        <div className="max-h-64 overflow-y-auto">
          {results.length === 0 && (
            <div className="px-4 py-5 text-center text-xs text-[var(--color-muted)] font-mono">
              {query ? '无匹配节点' : '输入关键词搜索…'}
            </div>
          )}
          {results.map((n, i) => {
            const accent   = TYPE_COLORS[n.type] ?? 'var(--color-muted)'
            const isActive = i === cursor
            const isPicked = selectedTitles.includes(n.title)
            return (
              <button
                key={n.id}
                onClick={() => { onSelect(n); onClose() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                style={{
                  background: isActive ? 'rgba(0,200,232,0.08)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--color-accent2)' : '2px solid transparent',
                }}>
                <span
                  className="text-[10px] font-mono px-1 py-0.5 shrink-0"
                  style={{
                    color:      accent,
                    border:     `1px solid ${accent}44`,
                    background: `${accent}0e`,
                    clipPath:   'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
                  }}>
                  {TYPE_LABELS[n.type] ?? n.type}
                </span>
                <span className="flex-1 text-sm text-[var(--color-text)] truncate">{n.title}</span>
                {isPicked && (
                  <span className="text-[10px] font-mono text-[var(--color-accent2)] shrink-0">✓</span>
                )}
              </button>
            )
          })}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {(['↑↓ 导航', '↵ 选择', 'Esc 关闭'] as const).map(hint => (
            <span key={hint} className="text-[10px] text-[var(--color-muted)] font-mono">{hint}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
