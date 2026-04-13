import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useVaultStore }  from '../../stores/vault.store'
import { useEditorStore } from '../../stores/editor.store'
import type { FolderNode } from '@shared/types'

interface Props { style?: React.CSSProperties }

export function NavSidebar({ style }: Props) {
  const { vaultId }    = useParams<{ vaultId: string }>()
  const [searchParams] = useSearchParams()
  const { folders, loadFolders } = useVaultStore()
  const { activeNode } = useEditorStore()
  const navigate       = useNavigate()
  const [creating, setCreating] = useState(false)
  const [newName,  setNewName]  = useState('')

  const tree           = useMemo(() => buildTree(folders), [folders])
  const activeFolderId = searchParams.get('folder') ?? undefined

  const handleCreateFolder = async () => {
    if (!newName.trim() || !vaultId) return
    await window.api.folder.create({ vaultId, name: newName.trim(), path: newName.trim() })
    await loadFolders(vaultId)
    setCreating(false)
    setNewName('')
  }

  return (
    <aside
      className="flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] overflow-hidden shrink-0 relative"
      style={style}>

      {/* 顶部双色描边：电紫 → 金 */}
      <div className="absolute top-0 left-0 right-0 h-[2px] shrink-0"
        style={{ background: 'linear-gradient(to right, var(--color-accent3), var(--color-accent) 55%, rgba(245,184,48,0.08) 85%, transparent)' }} />

      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)] shrink-0 mt-[2px]">
        <span className="section-label" style={{ letterSpacing: '0.2em' }}>NAVIGATOR</span>
        <button
          onClick={() => setCreating(v => !v)}
          style={{
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            lineHeight: 1,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-accent)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')}>
          +
        </button>
      </div>

      {creating && (
        <div className="px-2 py-1.5 border-b border-[var(--color-border)] shrink-0">
          <input
            autoFocus
            className="input text-xs py-1 px-2 w-full"
            placeholder="文件夹名称"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  handleCreateFolder()
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
          />
        </div>
      )}

      {/* 全部节点 */}
      <button
        onClick={() => navigate(`/vault/${vaultId}/workspace`)}
        className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-[var(--color-border)] transition-all"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.04em',
          color:      !activeFolderId ? 'var(--color-accent)' : 'var(--color-muted2)',
          background: !activeFolderId ? 'rgba(232,160,32,0.06)' : 'transparent',
          borderLeft: !activeFolderId ? '2px solid var(--color-accent)' : '2px solid transparent',
        }}>
        <span style={{ fontSize: '9px', opacity: 0.7 }}>◈</span>
        <span>全部节点</span>
        {!activeFolderId && (
          <span style={{ marginLeft: 'auto', fontSize: '8px', color: 'var(--color-accent)', opacity: 0.5, letterSpacing: '0.1em' }}>ACTIVE</span>
        )}
      </button>

      <div className="flex-1 overflow-y-auto py-1">
        {tree.map(node => (
          <FolderTreeNode key={node.id} node={node} depth={0} vaultId={vaultId!} activeId={activeFolderId} onRefresh={() => loadFolders(vaultId!)} />
        ))}
        {tree.length === 0 && (
          <div className="px-4 py-4 text-[10px] text-[var(--color-muted)] font-mono" style={{ letterSpacing: '0.08em' }}>
            // NO FOLDERS
          </div>
        )}
      </div>

      {activeNode && (
        <div className="border-t border-[var(--color-border)] px-3 py-2.5 shrink-0"
          style={{ background: 'rgba(232,160,32,0.02)' }}>
          <div className="section-label mb-1.5" style={{ letterSpacing: '0.18em' }}>ACTIVE NODE</div>
          <div className="truncate" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-muted2)',
            letterSpacing: '0.02em',
          }}>{activeNode.title}</div>
        </div>
      )}
    </aside>
  )
}

interface TreeNode extends FolderNode { children: TreeNode[] }

function buildTree(folders: FolderNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  folders.forEach(f => map.set(f.id, { ...f, children: [] }))
  const roots: TreeNode[] = []
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function FolderTreeNode({ node, depth, vaultId, activeId, onRefresh }: {
  node: TreeNode; depth: number; vaultId: string; activeId: string | undefined; onRefresh: () => void
}) {
  const navigate       = useNavigate()
  const [open,     setOpen]     = useState(true)
  const [hovered,  setHovered]  = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName,  setNewName]  = useState(node.name)

  const isActive    = activeId === node.id
  const hasChildren = node.children.length > 0

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === node.name) { setRenaming(false); setNewName(node.name); return }
    await window.api.folder.rename(node.id, newName.trim())
    setRenaming(false)
    onRefresh()
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`删除文件夹「${node.name}」？其中的节点不会被删除。`)) return
    await window.api.folder.delete(node.id)
    onRefresh()
  }

  return (
    <div>
      <div
        className="relative flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>

        {renaming ? (
          <input
            autoFocus
            className="input text-xs py-0.5 px-2 flex-1 mx-2 my-0.5"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter')  handleRename()
              if (e.key === 'Escape') { setRenaming(false); setNewName(node.name) }
            }}
          />
        ) : (
          <button
            onClick={() => {
              navigate(`/vault/${vaultId}/workspace?folder=${node.id}`)
              if (hasChildren) setOpen(v => !v)
            }}
            onDoubleClick={e => { e.preventDefault(); setRenaming(true) }}
            className="flex-1 flex items-center gap-1.5 py-1.5 text-left transition-all"
            style={{
              paddingLeft:  `${10 + depth * 14}px`,
              paddingRight: '28px',
              fontFamily:   'var(--font-mono)',
              fontSize:     '11px',
              letterSpacing: '0.03em',
              color:        isActive ? 'var(--color-accent)' : hovered ? 'var(--color-text)' : 'var(--color-muted2)',
              background:   isActive ? 'rgba(232,160,32,0.07)' : hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
              borderLeft:   isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}>
            <span style={{ fontSize: '8px', color: isActive ? 'var(--color-accent)' : 'var(--color-muted)', flexShrink: 0, width: '12px' }}>
              {hasChildren ? (open ? '▾' : '▸') : '·'}
            </span>
            <span className="truncate">{node.name}</span>
          </button>
        )}

        {/* 悬停操作按钮 */}
        {hovered && !renaming && (
          <div className="absolute right-1 flex items-center gap-0.5">
            <button
              onClick={e => { e.stopPropagation(); setRenaming(true) }}
              title="重命名"
              className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-accent)] px-0.5 transition-colors">
              ✎
            </button>
            <button
              onClick={handleDelete}
              title="删除文件夹"
              className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-danger)] px-0.5 transition-colors">
              ✕
            </button>
          </div>
        )}
      </div>

      {open && node.children.map(child => (
        <FolderTreeNode key={child.id} node={child} depth={depth + 1} vaultId={vaultId} activeId={activeId} onRefresh={onRefresh} />
      ))}
    </div>
  )
}
