import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Attachment, Entity, FieldDefinition, FieldValue, Template } from '@shared/types'
import { FieldValueEditor } from './FieldValueEditor'

interface Props {
  entity:          Entity
  onSave:          (fields: Record<string, FieldValue>) => void
  onCoverChange?:  (path: string) => void
  onTagsChange?:   (tags: string[]) => void
}

const STATUS_STYLES: Record<string, string> = {
  canon:     'badge-green',
  draft:     'badge-muted',
  archived:  'badge-amber',
  discarded: 'badge-red',
}

const STATUS_LABELS: Record<string, string> = {
  canon:     '正典',
  draft:     '草稿',
  archived:  '归档',
  discarded: '废弃',
}

const TYPE_LABELS: Record<string, string> = {
  character: '角色', location: '地点', faction: '势力', event: '事件',
  item: '物品', term: '术语', chapter: '章节', scene: '场景', document: '文档',
}

export function FieldPanel({ entity, onSave, onCoverChange, onTagsChange }: Props) {
  const [template,       setTemplate]       = useState<Template | null>(null)
  const [templateLoaded, setTemplateLoaded] = useState(false)
  const [localFields,    setLocalFields]    = useState<Record<string, FieldValue>>(
    (entity as any).fields ?? {}
  )
  const [dirty, setDirty] = useState(false)
  const [editingTags, setEditingTags] = useState(false)
  const [tagInput,    setTagInput]    = useState('')

  // 加载此 entity type 对应的模板
  useEffect(() => {
    if (entity.type === 'document') { setTemplateLoaded(true); return }
    setTemplateLoaded(false)
    window.api.template.getByType(entity.type).then(t => {
      setTemplate(t ?? null)
      setTemplateLoaded(true)
    })
  }, [entity.type])

  // entity 切换时重置本地字段
  useEffect(() => {
    setLocalFields((entity as any).fields ?? {})
    setDirty(false)
  }, [entity.id])

  const handleFieldChange = useCallback((key: string, val: FieldValue) => {
    setLocalFields(prev => ({ ...prev, [key]: val }))
    setDirty(true)
  }, [])

  const handleSave = () => {
    onSave(localFields)
    setDirty(false)
  }

  const defs: FieldDefinition[] = template?.fields ?? []

  const handlePickCover = async () => {
    const filePath = await window.api.dialog.openFile({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      properties: ['openFile'],
    })
    if (filePath && onCoverChange) onCoverChange(filePath as string)
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] overflow-hidden">

      {/* ── 封面图 ── */}
      {entity.coverImage ? (
        <div className="relative shrink-0 h-28 overflow-hidden">
          <img
            src={`file:///${entity.coverImage.replace(/\\/g, '/')}`}
            alt="cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-surface)]" />
          {onCoverChange && (
            <button
              onClick={handlePickCover}
              className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-0.5 bg-black/60 text-[var(--color-muted2)] hover:text-[var(--color-accent)] transition-colors">
              更换封面
            </button>
          )}
        </div>
      ) : onCoverChange && (
        <button
          onClick={handlePickCover}
          className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-accent)] border-b border-[var(--color-border)] transition-colors shrink-0">
          <span>⊕</span><span>添加封面图</span>
        </button>
      )}

      {/* ── 顶部实体概要 ── */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="badge-cyan font-mono text-[10px]">{TYPE_LABELS[entity.type] ?? entity.type}</span>
          <span className={STATUS_STYLES[entity.status] ?? 'badge-muted'}>
            {STATUS_LABELS[entity.status] ?? entity.status}
          </span>
        </div>
        <div className="deco-line mb-3" />

        {/* 元信息 */}
        <div className="space-y-1.5">
          <MetaRow label="创建" value={new Date(entity.createdAt).toLocaleDateString('zh-CN')} />
          <MetaRow label="修改" value={new Date(entity.updatedAt).toLocaleDateString('zh-CN')} />
        </div>

        {/* 标签 */}
        <div className="mt-3">
          <div className="section-label mb-1.5">标签</div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {entity.tags.map(t => (
              <span key={t} className="badge-muted flex items-center gap-1">
                {t}
                {onTagsChange && (
                  <button
                    onClick={() => onTagsChange(entity.tags.filter(x => x !== t))}
                    className="text-[var(--color-muted)] hover:text-[var(--color-danger)] leading-none ml-0.5 transition-colors">
                    ×
                  </button>
                )}
              </span>
            ))}
            {entity.tags.length === 0 && !editingTags && (
              <span className="text-[11px] text-[var(--color-muted)] italic">无标签</span>
            )}
          </div>
          {onTagsChange && (
            editingTags ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  className="input text-xs py-0.5 px-2 flex-1"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="标签名，回车添加"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      const t = tagInput.trim()
                      if (!entity.tags.includes(t)) onTagsChange([...entity.tags, t])
                      setTagInput('')
                      setEditingTags(false)
                    }
                    if (e.key === 'Escape') { setTagInput(''); setEditingTags(false) }
                  }}
                  onBlur={() => { setTagInput(''); setEditingTags(false) }}
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingTags(true)}
                className="text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors">
                + 添加标签
              </button>
            )
          )}
        </div>
      </div>

      {/* ── 字段列表 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {entity.type === 'document' ? (
          <p className="text-xs text-[var(--color-muted)] italic">文档类型无自定义字段</p>
        ) : !templateLoaded ? (
          <p className="text-xs text-[var(--color-muted)] italic">加载字段定义中…</p>
        ) : defs.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-muted)] italic">此类型暂无字段模板</p>
            <p className="text-[10px] font-mono text-[var(--color-muted)] leading-relaxed">
              可前往 <span className="text-[var(--color-accent3)]">设置 → 字段模板</span> 为「{TYPE_LABELS[entity.type] ?? entity.type}」添加字段定义
            </p>
          </div>
        ) : (
          defs
            .filter(d => !d.hidden)
            .sort((a, b) => a.order - b.order)
            .map(def => (
              <div key={def.id}>
                <div className="section-label mb-1.5">{def.name}</div>
                <FieldValueEditor
                  def={def}
                  value={localFields[def.key] ?? def.defaultValue ?? null}
                  onChange={val => handleFieldChange(def.key, val)}
                />
              </div>
            ))
        )}
      </div>

      {/* ── 保存按钮 ── */}
      {dirty && (
        <div className="px-4 py-3 border-t border-[var(--color-border)] shrink-0">
          <button onClick={handleSave} className="btn-primary w-full justify-center text-xs py-1.5">
            保存字段
          </button>
        </div>
      )}

      {/* ── 附件区域 ── */}
      <AttachmentsSection nodeId={entity.id} />

      {/* ── 反链区域 ── */}
      <BacklinksSection entityId={entity.id} />
    </div>
  )
}

/* ── 元信息行 ── */
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="section-label w-8 shrink-0">{label}</span>
      <span className="text-xs text-[var(--color-muted2)] font-mono">{value}</span>
    </div>
  )
}

/* ── 附件面板 ── */
function AttachmentsSection({ nodeId }: { nodeId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const load = () => window.api.attachment.list(nodeId).then(setAttachments)
  useEffect(() => { load() }, [nodeId])

  const handleAdd = async () => {
    const filePath = await window.api.dialog.openFile({ properties: ['openFile', 'multiSelections'] })
    if (!filePath) return
    const paths = Array.isArray(filePath) ? filePath : [filePath]
    for (const p of paths) {
      await window.api.attachment.add(nodeId, p)
    }
    load()
  }

  const handleDelete = async (id: string) => {
    await window.api.attachment.delete(id)
    load()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const isImage = (mime: string) => mime.startsWith('image/')

  return (
    <div className="border-t border-[var(--color-border)] px-4 py-3 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">附件 {attachments.length > 0 ? `(${attachments.length})` : ''}</span>
        <button
          onClick={handleAdd}
          className="text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors">
          + 添加
        </button>
      </div>

      {attachments.length === 0 && (
        <p className="text-[11px] text-[var(--color-muted)] italic">无附件</p>
      )}

      <div className="space-y-1">
        {attachments.map(a => (
          <div key={a.id} className="group flex items-center gap-2">
            {/* 图片预览小图 */}
            {isImage(a.mimeType) ? (
              <img
                src={`file:///${a.filePath.replace(/\\/g, '/')}`}
                alt={a.fileName}
                className="w-6 h-6 object-cover shrink-0"
                style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 0 100%)' }}
              />
            ) : (
              <span className="text-[10px] font-mono text-[var(--color-muted)] w-6 text-center shrink-0">
                {a.mimeType === 'application/pdf' ? 'PDF' : '📎'}
              </span>
            )}

            <div className="flex-1 min-w-0">
              <button
                onClick={() => (window as any).shell?.openPath(a.filePath)}
                className="text-[11px] text-[var(--color-muted2)] hover:text-[var(--color-accent)] truncate block text-left transition-colors w-full"
                title={a.fileName}>
                {a.fileName}
              </button>
              <span className="text-[10px] font-mono text-[var(--color-muted)]">{formatSize(a.size)}</span>
            </div>

            <button
              onClick={() => handleDelete(a.id)}
              className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-all shrink-0">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 反链面板 ── */
function BacklinksSection({ entityId }: { entityId: string }) {
  const { vaultId } = useParams<{ vaultId: string }>()
  const navigate    = useNavigate()
  const [backlinks, setBacklinks] = useState<{ id: string; title: string; type: string }[]>([])

  useEffect(() => {
    window.api.node.getBacklinks(entityId).then(nodes =>
      setBacklinks(nodes.map((n: any) => ({ id: n.id, title: n.title, type: n.type })))
    )
  }, [entityId])

  if (backlinks.length === 0) return null

  return (
    <div className="border-t border-[var(--color-border)] px-4 py-3 shrink-0">
      <div className="section-label mb-2">反向链接 ({backlinks.length})</div>
      <div className="space-y-1">
        {backlinks.slice(0, 8).map(n => (
          <button
            key={n.id}
            onClick={() => navigate(`/vault/${vaultId}/entity/${n.id}`)}
            className="w-full flex items-center gap-2 py-0.5 text-xs text-[var(--color-muted2)] hover:text-[var(--color-accent)] transition-colors text-left">
            <span className="w-1 h-1 bg-[var(--color-accent)] opacity-50 shrink-0" />
            <span className="truncate">{n.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
