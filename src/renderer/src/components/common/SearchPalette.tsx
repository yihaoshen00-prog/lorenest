import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AnyNode } from '@shared/types'

const TYPE_LABELS: Record<string, string> = {
  character: '角色', location: '地点', faction: '势力', event: '事件',
  item: '物品', term: '术语', chapter: '章节', scene: '场景', document: '文档',
}

const TYPE_COLORS: Record<string, string> = {
  character: 'var(--color-accent)',
  location:  '#4caf50',
  faction:   'var(--color-accent2)',
  event:     '#ff9800',
  item:      '#ffeb3b',
  term:      '#00bcd4',
  chapter:   '#e91e63',
  scene:     '#f44336',
  document:  'var(--color-muted)',
}

interface Props {
  open:    boolean
  onClose: () => void
}

export function SearchPalette({ open, onClose }: Props) {
  const { vaultId }    = useParams<{ vaultId: string }>()
  const navigate       = useNavigate()
  const inputRef       = useRef<HTMLInputElement>(null)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<AnyNode[]>([])
  const [selected, setSelected] = useState(0)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // 全局 ESC 监听（比依赖 div 冒泡更可靠）
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, onClose])

  // 搜索防抖
  const doSearch = useCallback((q: string) => {
    if (!vaultId || !q.trim()) { setResults([]); return }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      const hits = await window.api.node.search(q.trim(), { vaultId, limit: 20 })
      setResults(hits)
      setSelected(0)
    }, 150)
  }, [vaultId])

  useEffect(() => { doSearch(query) }, [query, doSearch])

  const select = (node: AnyNode) => {
    navigate(`/vault/${vaultId}/entity/${node.id}`)
    onClose()
  }

  // 键盘导航
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) select(results[selected])
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(10,11,20,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div
        className="w-full max-w-xl bg-[var(--color-surface2)] border border-[var(--color-border2)]"
        style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
        onKeyDown={handleKey}>

        {/* 顶部装饰线 */}
        <div className="h-px bg-[var(--color-accent)]" />

        {/* 搜索输入 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-accent)] text-base font-mono shrink-0">⌕</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-[var(--color-text)] text-sm selectable
                       placeholder:text-[var(--color-muted)]"
            placeholder="搜索节点标题、内容、标签…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="text-[10px] text-[var(--color-muted)] font-mono shrink-0">ESC 关闭</span>
        </div>

        {/* 结果列表 */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center text-xs text-[var(--color-muted)] font-mono">
              无匹配结果
            </div>
          )}
          {results.length === 0 && !query.trim() && (
            <div className="px-4 py-6 text-center text-xs text-[var(--color-muted)]">
              输入关键词开始搜索
            </div>
          )}
          {results.map((node, i) => (
            <button
              key={node.id}
              onClick={() => select(node)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{
                background: i === selected ? 'rgba(232,160,32,0.08)' : 'transparent',
                borderLeft: i === selected ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}>
              <span
                className="text-[10px] font-mono px-1 py-0.5 shrink-0"
                style={{
                  color: TYPE_COLORS[node.type] ?? 'var(--color-muted)',
                  border: `1px solid ${TYPE_COLORS[node.type] ?? 'var(--color-border)'}44`,
                  background: `${TYPE_COLORS[node.type] ?? 'transparent'}11`,
                }}>
                {TYPE_LABELS[node.type] ?? node.type}
              </span>
              <span className="flex-1 text-sm text-[var(--color-text)] truncate">{node.title}</span>
              {node.tags.length > 0 && (
                <span className="text-[10px] text-[var(--color-muted)] font-mono truncate max-w-[100px]">
                  {node.tags.slice(0, 2).join(' · ')}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <KbdHint keys={['↑', '↓']} label="导航" />
          <KbdHint keys={['↵']}      label="打开" />
          <KbdHint keys={['Esc']}    label="关闭" />
          {results.length > 0 && (
            <span className="ml-auto text-[10px] text-[var(--color-muted)] font-mono">
              {results.length} 条结果
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
      {keys.map(k => (
        <kbd key={k}
          className="px-1 py-0.5 font-mono bg-[var(--color-border)] border border-[var(--color-border2)] text-[var(--color-muted2)]">
          {k}
        </kbd>
      ))}
      <span className="ml-0.5">{label}</span>
    </div>
  )
}
