import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AnyNode, Relation } from '@shared/types'

// 预设关系标签（可直接输入自定义）
const PRESET_TYPES = ['隶属于', '对立', '恋人', '盟友', '上级', '下级', '创造者', '来自', '知晓', '参与']

const TYPE_COLOR: Record<string, string> = {
  character: '#e8a020', location: '#4caf50', faction: '#00c8e8',
  event:     '#ff9800', item:     '#ffeb3b', term:    '#00bcd4',
  chapter:   '#e91e63', scene:    '#f44336', document: '#5a6080',
}
const TYPE_LABEL: Record<string, string> = {
  character: '角色', location: '地点', faction: '势力', event: '事件',
  item: '物品', term: '术语', chapter: '章节', scene: '场景', document: '文档',
}

interface Props {
  nodeId:  string
  vaultId: string
}

export function RelationPanel({ nodeId, vaultId }: Props) {
  const navigate = useNavigate()

  const [relations,  setRelations]  = useState<Relation[]>([])
  const [nodeCache,  setNodeCache]  = useState<Record<string, AnyNode>>({})
  const [adding,     setAdding]     = useState(false)
  const [allNodes,   setAllNodes]   = useState<AnyNode[]>([])

  // 新建表单状态
  const [selTarget,  setSelTarget]  = useState('')
  const [relType,    setRelType]    = useState('')
  const [customType, setCustomType] = useState('')
  const [relNote,    setRelNote]    = useState('')
  const [saving,     setSaving]     = useState(false)

  const load = useCallback(() => {
    window.api.relation.list({ vaultId, nodeId }).then(setRelations)
  }, [vaultId, nodeId])

  useEffect(() => { load() }, [load])

  // 缓存关联节点信息
  useEffect(() => {
    const ids = new Set<string>()
    relations.forEach(r => { ids.add(r.sourceId); ids.add(r.targetId) })
    ids.delete(nodeId)
    const missing = [...ids].filter(id => !nodeCache[id])
    if (missing.length === 0) return
    Promise.all(missing.map(id => window.api.node.get(id))).then(nodes => {
      setNodeCache(prev => {
        const next = { ...prev }
        nodes.forEach(n => { if (n) next[n.id] = n })
        return next
      })
    })
  }, [relations, nodeId])

  // 打开"添加"时加载全部节点供选择
  useEffect(() => {
    if (!adding) return
    window.api.node.list({ vaultId }).then(ns =>
      setAllNodes(ns.filter(n => n.id !== nodeId))
    )
  }, [adding, vaultId, nodeId])

  const handleAdd = async () => {
    if (!selTarget) return
    const type = relType === '__custom__' ? customType.trim() : relType
    if (!type) return
    setSaving(true)
    await window.api.relation.create({
      vaultId,
      sourceId:     nodeId,
      targetId:     selTarget,
      relationType: type,
      note:         relNote.trim() || undefined,
    })
    setSaving(false)
    setAdding(false)
    setSelTarget(''); setRelType(''); setCustomType(''); setRelNote('')
    load()
  }

  const handleDelete = async (id: string) => {
    await window.api.relation.delete(id)
    load()
  }

  const peer = (r: Relation) => r.sourceId === nodeId ? r.targetId : r.sourceId
  const dir  = (r: Relation) => r.sourceId === nodeId ? 'out' : 'in'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部标题 + 添加按钮 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-[10px] font-mono text-[var(--color-muted)] tracking-widest">RELATIONS</span>
        <button
          onClick={() => setAdding(v => !v)}
          className="text-[10px] font-mono px-2 py-0.5 transition-colors"
          style={{
            color:      adding ? 'var(--color-bg)' : 'var(--color-accent)',
            background: adding ? 'var(--color-accent)' : 'transparent',
            border:     '1px solid var(--color-accent)',
            clipPath:   'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
          }}>
          {adding ? '✕ 取消' : '＋ 添加'}
        </button>
      </div>

      {/* 添加表单 */}
      {adding && (
        <div className="px-3 py-3 border-b border-[var(--color-border)] space-y-2 shrink-0 bg-[var(--color-surface)]">
          {/* 目标节点 */}
          <div>
            <div className="text-[9px] font-mono text-[var(--color-muted)] mb-1">目标节点</div>
            <select
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border2)] text-xs font-mono
                         text-[var(--color-text)] px-2 py-1 outline-none"
              value={selTarget}
              onChange={e => setSelTarget(e.target.value)}>
              <option value="">-- 选择节点 --</option>
              {allNodes.map(n => (
                <option key={n.id} value={n.id} style={{ background: '#141726' }}>
                  [{TYPE_LABEL[n.type] ?? n.type}] {n.title}
                </option>
              ))}
            </select>
          </div>

          {/* 关系类型 */}
          <div>
            <div className="text-[9px] font-mono text-[var(--color-muted)] mb-1">关系类型</div>
            <div className="flex gap-1 flex-wrap mb-1.5">
              {PRESET_TYPES.map(t => (
                <button key={t}
                  onClick={() => { setRelType(t); setCustomType('') }}
                  className="text-[9px] font-mono px-1.5 py-0.5 transition-colors"
                  style={{
                    color:      relType === t ? 'var(--color-bg)' : 'var(--color-muted)',
                    background: relType === t ? 'var(--color-accent)' : 'transparent',
                    border:     `1px solid ${relType === t ? 'var(--color-accent)' : 'var(--color-border2)'}`,
                  }}>
                  {t}
                </button>
              ))}
              <button
                onClick={() => setRelType('__custom__')}
                className="text-[9px] font-mono px-1.5 py-0.5 transition-colors"
                style={{
                  color:      relType === '__custom__' ? 'var(--color-bg)' : 'var(--color-muted)',
                  background: relType === '__custom__' ? 'var(--color-accent2)' : 'transparent',
                  border:     `1px solid ${relType === '__custom__' ? 'var(--color-accent2)' : 'var(--color-border2)'}`,
                }}>
                自定义
              </button>
            </div>
            {relType === '__custom__' && (
              <input
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border2)] text-xs font-mono
                           text-[var(--color-text)] px-2 py-1 outline-none focus:border-[var(--color-accent)]"
                placeholder="输入关系标签…"
                value={customType}
                onChange={e => setCustomType(e.target.value)}
              />
            )}
          </div>

          {/* 备注（可选） */}
          <div>
            <div className="text-[9px] font-mono text-[var(--color-muted)] mb-1">备注（可选）</div>
            <input
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border2)] text-xs font-mono
                         text-[var(--color-text)] px-2 py-1 outline-none focus:border-[var(--color-accent)]"
              placeholder="关系说明…"
              value={relNote}
              onChange={e => setRelNote(e.target.value)}
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={saving || !selTarget || (!relType || (relType === '__custom__' && !customType.trim()))}
            className="w-full text-[10px] font-mono py-1.5 transition-colors disabled:opacity-40"
            style={{
              background: 'var(--color-accent)',
              color:      'var(--color-bg)',
              clipPath:   'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
            }}>
            {saving ? 'SAVING…' : '确认添加'}
          </button>
        </div>
      )}

      {/* 关系列表 */}
      <div className="flex-1 overflow-y-auto">
        {relations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-6 h-6 border border-dashed border-[var(--color-border2)] flex items-center justify-center">
              <div className="w-2 h-2 border border-[var(--color-muted)]" />
            </div>
            <p className="text-[9px] font-mono text-[var(--color-muted)]">// 暂无关系</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {relations.map(r => {
              const peerId  = peer(r)
              const peerNode = nodeCache[peerId]
              const isOut   = dir(r) === 'out'
              const accent  = peerNode ? (TYPE_COLOR[peerNode.type] ?? '#5a6080') : 'var(--color-muted2)'
              return (
                <div key={r.id} className="group px-3 py-2 hover:bg-[var(--color-surface)] transition-colors">
                  {/* 方向 + 类型标签 */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-mono text-[var(--color-muted)]">
                      {isOut ? '→' : '←'}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5"
                      style={{
                        color:      'var(--color-text)',
                        border:     `1px solid ${accent}88`,
                        background: `${accent}22`,
                        clipPath:   'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
                        fontWeight:  600,
                      }}>
                      {r.relationType}
                    </span>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="ml-auto text-[10px] opacity-0 group-hover:opacity-100 transition-opacity
                                 text-[var(--color-muted)] hover:text-[var(--color-danger)]">
                      ×
                    </button>
                  </div>

                  {/* 对端节点 */}
                  <button
                    onClick={() => navigate(`/vault/${vaultId}/entity/${peerId}`)}
                    className="flex items-center gap-1.5 w-full text-left hover:underline">
                    {peerNode && (
                      <span className="text-[9px] font-mono shrink-0"
                        style={{ color: accent }}>
                        [{TYPE_LABEL[peerNode.type] ?? peerNode.type}]
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text)] truncate">
                      {peerNode?.title ?? peerId}
                    </span>
                  </button>

                  {/* 备注 */}
                  {r.note && (
                    <p className="text-[9px] text-[var(--color-muted)] mt-1 font-mono truncate">
                      // {r.note}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
