import { useUIStore }    from '../../stores/ui.store'
import { useEditorStore } from '../../stores/editor.store'
import { useNavigate, useParams } from 'react-router-dom'

export function RightPanel() {
  const { rightPanelView, setRightPanel } = useUIStore()
  const { activeNode, backlinks }         = useEditorStore()
  const navigate = useNavigate()
  const { vaultId } = useParams<{ vaultId: string }>()

  const tabs = [
    { key: 'properties', label: '属性' },
    { key: 'backlinks',  label: `反链 (${backlinks.length})` },
    { key: 'attachments', label: '附件' },
  ] as const

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-[var(--color-surface)] border-l border-[var(--color-border)] overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border)]">
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setRightPanel(true, t.key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              rightPanelView === t.key
                ? 'text-[var(--color-text)] border-b-2 border-accent'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => setRightPanel(false)}
          className="px-2 text-[var(--color-muted)] hover:text-[var(--color-text)]">✕</button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-3">
        {rightPanelView === 'backlinks' && (
          <div className="space-y-1">
            {backlinks.length === 0
              ? <p className="text-xs text-[var(--color-muted)] italic">暂无反链</p>
              : backlinks.map(n => (
                  <button key={n.id}
                    onClick={() => navigate(`/vault/${vaultId}/entity/${n.id}`)}
                    className="w-full text-left text-sm px-2 py-1 rounded hover:bg-[var(--color-bg)] text-[var(--color-text)] transition-colors">
                    {n.title}
                  </button>
                ))
            }
          </div>
        )}
        {rightPanelView === 'properties' && !activeNode && (
          <p className="text-xs text-[var(--color-muted)] italic">请选择一个文档或实体</p>
        )}
        {rightPanelView === 'properties' && activeNode && (
          <div className="space-y-2 text-xs">
            <PropRow label="类型"    value={activeNode.type} />
            <PropRow label="状态"    value={activeNode.status} />
            <PropRow label="标签"    value={activeNode.tags.join(', ') || '—'} />
            <PropRow label="创建于"  value={new Date(activeNode.createdAt).toLocaleDateString('zh-CN')} />
            <PropRow label="更新于"  value={new Date(activeNode.updatedAt).toLocaleDateString('zh-CN')} />
          </div>
        )}
        {rightPanelView === 'attachments' && (
          <p className="text-xs text-[var(--color-muted)] italic">附件管理（待实现）</p>
        )}
      </div>
    </aside>
  )
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[var(--color-muted)] w-14 shrink-0">{label}</span>
      <span className="text-[var(--color-text)] break-all">{value}</span>
    </div>
  )
}
