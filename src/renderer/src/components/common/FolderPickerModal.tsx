import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { FolderNode } from '@shared/types'

interface Props {
  open:           boolean
  onClose:        () => void
  onSelect:       (folderId: string | null) => void
  currentFolderId?: string
}

export function FolderPickerModal({ open, onClose, onSelect, currentFolderId }: Props) {
  const { vaultId } = useParams<{ vaultId: string }>()
  const [folders, setFolders] = useState<FolderNode[]>([])

  useEffect(() => {
    if (open && vaultId) {
      window.api.folder.list(vaultId).then(setFolders)
    }
  }, [open, vaultId])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32"
      style={{ background: 'rgba(10,11,20,0.7)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div
        className="w-72 bg-[var(--color-surface2)] border border-[var(--color-border2)]"
        style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>

        <div className="h-px bg-[var(--color-accent)]" />

        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <span className="text-xs font-mono text-[var(--color-muted2)]">移动到文件夹</span>
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {/* 根目录选项 */}
          <button
            onClick={() => { onSelect(null); onClose() }}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left transition-colors"
            style={{
              color:      !currentFolderId ? 'var(--color-accent)' : 'var(--color-muted2)',
              background: !currentFolderId ? 'rgba(232,160,32,0.07)' : 'transparent',
              borderLeft: !currentFolderId ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}>
            <span className="font-mono text-[10px]">◈</span>
            <span>根目录（无文件夹）</span>
            {!currentFolderId && <span className="ml-auto text-[10px] font-mono">当前</span>}
          </button>

          {folders.length === 0 && (
            <div className="px-4 py-4 text-[11px] text-[var(--color-muted)] italic font-mono text-center">
              // 暂无文件夹
            </div>
          )}

          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => { onSelect(f.id); onClose() }}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left transition-colors"
              style={{
                color:      f.id === currentFolderId ? 'var(--color-accent)' : 'var(--color-muted2)',
                background: f.id === currentFolderId ? 'rgba(232,160,32,0.07)' : 'transparent',
                borderLeft: f.id === currentFolderId ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}>
              <span className="font-mono text-[10px] text-[var(--color-muted)]">▸</span>
              <span className="truncate">{f.name}</span>
              {f.id === currentFolderId && <span className="ml-auto text-[10px] font-mono shrink-0">当前</span>}
            </button>
          ))}
        </div>

        <div className="border-t border-[var(--color-border)] px-4 py-2">
          <button onClick={onClose} className="text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors">
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
