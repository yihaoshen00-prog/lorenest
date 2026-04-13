import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditorStore }   from '../../stores/editor.store'
import { MarkdownEditor }   from '../../components/editor/MarkdownEditor'
import { MarkdownPreview }  from '../../components/editor/MarkdownPreview'
import { FieldPanel }         from '../../components/entity/FieldPanel'
import { RelationPanel }      from '../../components/entity/RelationPanel'
import { FolderPickerModal }  from '../../components/common/FolderPickerModal'
import type { Entity, FieldValue, NodeStatus } from '@shared/types'

type ViewMode = 'edit' | 'preview' | 'split'

const STATUS_OPTIONS: { value: NodeStatus; label: string }[] = [
  { value: 'draft',     label: '草稿' },
  { value: 'canon',     label: '正典' },
  { value: 'archived',  label: '归档' },
  { value: 'discarded', label: '废弃' },
]

const STATUS_COLORS: Record<string, string> = {
  canon:     'var(--color-success)',
  draft:     'var(--color-muted2)',
  archived:  'var(--color-accent)',
  discarded: 'var(--color-danger)',
}

export function EntityDetailPage() {
  const { nodeId, vaultId } = useParams<{ nodeId: string; vaultId: string }>()
  const navigate    = useNavigate()
  const { activeNode, loadNode, saveNode, setDirty, isDirty } = useEditorStore()
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [panelOpen,      setPanelOpen]      = useState(true)
  const [panelTab,       setPanelTab]       = useState<'fields' | 'relations'>('fields')

  // 文档类型默认显示关系tab
  useEffect(() => {
    if (activeNode && activeNode.type === 'document') setPanelTab('relations')
    else setPanelTab('fields')
  }, [activeNode?.id])
  const [viewMode,       setViewMode]       = useState<ViewMode>('edit')
  const [folderPickOpen, setFolderPickOpen] = useState(false)
  // 本地标题 state — 立即响应输入，不等待 store 回写
  const [localTitle, setLocalTitle] = useState('')

  useEffect(() => {
    if (nodeId) loadNode(nodeId)
  }, [nodeId])

  // 切换节点时同步标题到本地 state
  useEffect(() => {
    if (activeNode) setLocalTitle(activeNode.title)
  }, [activeNode?.id])

  const handleContentChange = useCallback((content: string) => {
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNode({ content }), 500)
  }, [saveNode, setDirty])

  const handleTitleChange = useCallback((title: string) => {
    setLocalTitle(title)   // 立即更新 UI，无延迟
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNode({ title }), 600)
  }, [saveNode, setDirty])

  const handleStatusChange = useCallback((status: NodeStatus) => {
    saveNode({ status })
  }, [saveNode])

  const handleFieldsSave = useCallback((fields: Record<string, FieldValue>) => {
    saveNode({ fields } as any)
  }, [saveNode])

  const handleCoverChange = useCallback((coverImage: string) => {
    saveNode({ coverImage } as any)
  }, [saveNode])

  const handleTagsChange = useCallback((tags: string[]) => {
    saveNode({ tags } as any)
  }, [saveNode])

  const handleForceSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const content = (activeNode as any)?.content ?? ''
    saveNode({ content })
  }, [activeNode, saveNode])

  const handleMoveToFolder = useCallback(async (folderId: string | null) => {
    saveNode({ folderNodeId: folderId ?? undefined } as any)
  }, [saveNode])

  const handleDelete = useCallback(async () => {
    if (!activeNode) return
    if (!confirm(`删除「${activeNode.title}」？此操作不可恢复。`)) return
    await window.api.node.delete(activeNode.id)
    navigate(`/vault/${vaultId}/workspace`)
  }, [activeNode, navigate, vaultId])

  // Ctrl+S 强制保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleForceSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleForceSave])

  if (!activeNode) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] text-[var(--color-muted)] font-mono tracking-widest">LOADING</p>
        </div>
      </div>
    )
  }

  const isEntity  = activeNode.type !== 'document'
  const hasPanel  = true   // 所有类型都显示右侧面板（文档仅显示关系tab）
  const content   = (activeNode as any).content ?? ''

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── 主编辑区 ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* 标题栏 */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
          <div className="w-0.5 h-5 bg-[var(--color-accent)] shrink-0" />

          <input
            className="flex-1 bg-transparent text-lg font-bold text-[var(--color-text)] outline-none selectable
                       placeholder:text-[var(--color-muted)] focus:outline-none min-w-0"
            value={localTitle}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="无标题"
          />

          {/* 视图模式切换 */}
          <div className="flex items-center shrink-0"
            style={{ border: '1px solid var(--color-border2)', clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}>
            {([
              { key: 'edit',    label: '编辑' },
              { key: 'split',   label: '分栏' },
              { key: 'preview', label: '预览' },
            ] as { key: ViewMode; label: string }[]).map(m => (
              <button
                key={m.key}
                onClick={() => setViewMode(m.key)}
                className="px-2 py-0.5 text-[10px] font-mono transition-colors"
                style={{
                  color:      viewMode === m.key ? 'var(--color-bg)' : 'var(--color-muted)',
                  background: viewMode === m.key ? 'var(--color-accent)' : 'transparent',
                }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* 状态 */}
          <select
            className="bg-transparent border-none outline-none text-xs font-mono cursor-pointer shrink-0"
            style={{ color: STATUS_COLORS[activeNode.status] ?? 'var(--color-muted)' }}
            value={activeNode.status}
            onChange={e => handleStatusChange(e.target.value as NodeStatus)}>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value} style={{ background: '#141726', color: '#e8e4d5' }}>
                {o.label}
              </option>
            ))}
          </select>

          <span className="text-[10px] font-mono shrink-0 w-14 text-right"
            style={{ color: isDirty ? 'var(--color-accent)' : 'var(--color-muted)' }}>
            {isDirty ? '● 未保存' : '✓ 已保存'}
          </span>

          {/* 移动到文件夹 */}
          <button
            onClick={() => setFolderPickOpen(true)}
            title="移动到文件夹"
            className="text-[10px] font-mono shrink-0 transition-colors text-[var(--color-muted)] hover:text-[var(--color-accent)] px-1.5 py-0.5 border border-transparent hover:border-[var(--color-border2)]">
            移至
          </button>

          {/* 删除节点 */}
          <button
            onClick={handleDelete}
            title="删除节点"
            className="text-sm shrink-0 transition-colors text-[var(--color-muted)] hover:text-[var(--color-danger)]">
            ␡
          </button>

          <button
            onClick={() => setPanelOpen(v => !v)}
            title={panelOpen ? '收起属性' : '展开属性'}
            className="text-base shrink-0 transition-colors"
            style={{ color: panelOpen ? 'var(--color-accent)' : 'var(--color-muted)' }}>
            ⊞
          </button>
        </div>

        <div className="deco-line shrink-0" />

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 编辑器 */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={viewMode === 'split' ? 'w-1/2 overflow-hidden border-r border-[var(--color-border)]' : 'flex-1 overflow-hidden'}>
              <MarkdownEditor
                value={content}
                onChange={handleContentChange}
              />
            </div>
          )}

          {/* 预览 */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={viewMode === 'split' ? 'w-1/2 overflow-hidden' : 'flex-1 overflow-hidden'}>
              <MarkdownPreview content={content} />
            </div>
          )}
        </div>
      </div>

      {/* ── 右侧面板 ── */}
      {hasPanel && panelOpen && (
        <>
          <div className="shrink-0 w-px bg-[var(--color-border)]" />
          <div className="w-60 shrink-0 flex flex-col overflow-hidden">
            {/* Tab 切换：文档类型仅显示关系tab */}
            <div className="flex shrink-0 border-b border-[var(--color-border)]"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}>
              {(isEntity ? ['fields', 'relations'] : ['relations'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPanelTab(tab as 'fields' | 'relations')}
                  className="flex-1 text-[10px] font-mono py-1.5 transition-colors"
                  style={{
                    color:      panelTab === tab ? 'var(--color-accent)' : 'var(--color-muted)',
                    background: panelTab === tab ? 'rgba(245,184,48,0.06)' : 'transparent',
                    borderBottom: panelTab === tab ? '1px solid var(--color-accent)' : '1px solid transparent',
                  }}>
                  {tab === 'fields' ? '字段' : '关系'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {panelTab === 'fields' ? (
                <FieldPanel
                  entity={activeNode as Entity}
                  onSave={handleFieldsSave}
                  onCoverChange={handleCoverChange}
                  onTagsChange={handleTagsChange}
                />
              ) : (
                <RelationPanel
                  nodeId={activeNode.id}
                  vaultId={vaultId!}
                />
              )}
            </div>
          </div>
        </>
      )}

      <FolderPickerModal
        open={folderPickOpen}
        onClose={() => setFolderPickOpen(false)}
        onSelect={handleMoveToFolder}
        currentFolderId={activeNode.folderNodeId}
      />
    </div>
  )
}
