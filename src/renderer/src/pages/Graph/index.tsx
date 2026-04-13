import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Node, type Edge,
  BackgroundVariant,
  EdgeLabelRenderer,
  BaseEdge,
  getStraightPath,
  getBezierPath,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { AnyNode, Relation } from '@shared/types'

const TYPE_COLOR: Record<string, string> = {
  character: '#e8a020',
  location:  '#4caf50',
  faction:   '#00c8e8',
  event:     '#ff9800',
  item:      '#ffeb3b',
  term:      '#00bcd4',
  chapter:   '#e91e63',
  scene:     '#f44336',
  document:  '#5a6080',
}

const TYPE_LABELS: Record<string, string> = {
  character: '角色', location: '地点', faction: '势力', event: '事件',
  item: '物品', term: '术语', chapter: '章节', scene: '场景', document: '文档',
}

// ── 自定义边：带标签 ───────────────────────────────────────

function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, markerEnd, style,
}: any) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const label = (data as any)?.label as string | undefined
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:  'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              fontSize:  '9px',
              fontFamily: 'monospace',
              color:     'var(--color-accent)',
              background: 'rgba(13,15,26,0.85)',
              border:    '1px solid rgba(232,160,32,0.3)',
              padding:   '1px 4px',
              clipPath:  'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
            }}
            className="nodrag nopan">
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const edgeTypes = { labeled: LabeledEdge }

// ── 构建图数据 ─────────────────────────────────────────────

function buildGraphData(
  nodes: AnyNode[],
  relations: Relation[],
  wikiLinks: Array<{ sourceId: string; targetId: string }>
) {
  const nodeSet = new Set(nodes.map(n => n.id))

  const flowNodes: Node[] = nodes.map((n, i) => {
    const col   = TYPE_COLOR[n.type] ?? '#5a6080'
    const angle = (i / nodes.length) * Math.PI * 2
    const r     = Math.min(300, 80 * Math.sqrt(nodes.length))
    return {
      id:   n.id,
      type: 'default',
      position: { x: Math.cos(angle) * r + 400, y: Math.sin(angle) * r + 300 },
      data: { label: n.title, type: n.type },
      style: {
        background:   `${col}18`,
        border:       `1px solid ${col}60`,
        borderRadius: 0,
        color:        col,
        fontSize:     '11px',
        fontFamily:   'monospace',
        padding:      '4px 8px',
        minWidth:     '80px',
        textAlign:    'center',
        clipPath:     'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
      },
    }
  })

  const flowEdges: Edge[] = []

  // 具名关系边（优先，带标签）
  const relSeen = new Set<string>()
  for (const r of relations) {
    if (!nodeSet.has(r.sourceId) || !nodeSet.has(r.targetId)) continue
    const key = `rel-${r.id}`
    if (relSeen.has(key)) continue
    relSeen.add(key)
    flowEdges.push({
      id:     key,
      source: r.sourceId,
      target: r.targetId,
      type:   'labeled',
      data:   { label: r.relationType },
      style:  { stroke: 'rgba(232,160,32,0.6)', strokeWidth: 1.5 },
      markerEnd: { type: 'arrowclosed' as any, color: 'rgba(232,160,32,0.7)' },
    })
  }

  // [[双链]] 边（细线，无标签，去重）
  const linkSeen = new Set<string>()
  for (const l of wikiLinks) {
    if (!nodeSet.has(l.sourceId) || !nodeSet.has(l.targetId)) continue
    const key = `${l.sourceId}-${l.targetId}`
    if (linkSeen.has(key)) continue
    linkSeen.add(key)
    flowEdges.push({
      id:     `link-${key}`,
      source: l.sourceId,
      target: l.targetId,
      style:  { stroke: 'rgba(90,96,128,0.4)', strokeWidth: 1, strokeDasharray: '3 3' },
      markerEnd: { type: 'arrowclosed' as any, color: 'rgba(90,96,128,0.4)' },
    })
  }

  return { flowNodes, flowEdges }
}

// ── 页面 ──────────────────────────────────────────────────

export function GraphPage() {
  const { vaultId } = useParams<{ vaultId: string }>()
  const navigate    = useNavigate()

  const [allNodes,    setAllNodes]    = useState<AnyNode[]>([])
  const [relations,   setRelations]   = useState<Relation[]>([])
  const [wikiLinks,   setWikiLinks]   = useState<{ sourceId: string; targetId: string }[]>([])
  const [typeFilter,  setTypeFilter]  = useState<string[]>([])
  const [showWiki,    setShowWiki]    = useState(true)
  const [loading,     setLoading]     = useState(true)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // 加载节点 + 具名关系 + wiki 双链
  useEffect(() => {
    if (!vaultId) return
    setLoading(true)
    Promise.all([
      window.api.node.list({ vaultId }),
      window.api.relation.list({ vaultId }),
    ]).then(async ([ns, rels]) => {
      setAllNodes(ns)
      setRelations(rels)
      // wiki 双链：批量取反链（限 60 节点）
      const links: { sourceId: string; targetId: string }[] = []
      for (const n of ns.slice(0, 60)) {
        const bls = await window.api.node.getBacklinks(n.id)
        bls.forEach((src: any) => links.push({ sourceId: src.id, targetId: n.id }))
      }
      setWikiLinks(links)
      setLoading(false)
    })
  }, [vaultId])

  // 重新构建图
  useEffect(() => {
    const filtered = typeFilter.length > 0
      ? allNodes.filter(n => typeFilter.includes(n.type))
      : allNodes
    const { flowNodes, flowEdges } = buildGraphData(
      filtered,
      relations,
      showWiki ? wikiLinks : []
    )
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [allNodes, relations, wikiLinks, typeFilter, showWiki])

  const onNodeClick = useCallback((_: any, node: Node) => {
    navigate(`/vault/${vaultId}/entity/${node.id}`)
  }, [vaultId, navigate])

  const types = [...new Set(allNodes.map(n => n.type))]
  const relCount  = edges.filter(e => e.id.startsWith('rel-')).length
  const linkCount = edges.filter(e => e.id.startsWith('link-')).length

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 flex-wrap">
        <span className="section-label">关系图谱</span>

        {/* 类型筛选 */}
        <div className="flex gap-1 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(prev =>
                prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
              )}
              className="text-[10px] font-mono px-1.5 py-0.5 transition-all"
              style={{
                color:      typeFilter.includes(t) ? (TYPE_COLOR[t] ?? '#fff') : 'var(--color-muted)',
                background: typeFilter.includes(t) ? `${TYPE_COLOR[t] ?? '#fff'}18` : 'transparent',
                border:     `1px solid ${typeFilter.includes(t) ? (TYPE_COLOR[t] ?? '#fff') + '60' : 'var(--color-border)'}`,
                clipPath:   'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
              }}>
              {TYPE_LABELS[t] ?? t}
            </button>
          ))}
          {typeFilter.length > 0 && (
            <button
              onClick={() => setTypeFilter([])}
              className="text-[10px] font-mono px-1.5 py-0.5 text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors">
              清除筛选
            </button>
          )}
        </div>

        {/* 双链显示开关 */}
        <button
          onClick={() => setShowWiki(v => !v)}
          className="text-[10px] font-mono px-2 py-0.5 transition-colors"
          style={{
            color:      showWiki ? 'var(--color-muted2)' : 'var(--color-muted)',
            background: 'transparent',
            border:     `1px solid ${showWiki ? 'var(--color-border2)' : 'var(--color-border)'}`,
            clipPath:   'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)',
          }}>
          {showWiki ? '⋯ 双链' : '— 双链'}
        </button>

        <span className="ml-auto text-[10px] font-mono text-[var(--color-muted)]">
          {nodes.length} 节点 · <span style={{ color: 'rgba(232,160,32,0.8)' }}>{relCount} 具名关系</span>
          {showWiki && <> · <span style={{ color: 'rgba(90,96,128,0.8)' }}>{linkCount} 双链</span></>}
        </span>
      </div>

      {/* 图区域 */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[10px] font-mono text-[var(--color-muted)] tracking-widest">LOADING GRAPH…</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            style={{ background: 'var(--color-bg)' }}>
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(58,64,96,0.5)"
            />
            <Controls
              style={{
                background:   'var(--color-surface)',
                border:       '1px solid var(--color-border)',
                borderRadius: 0,
              }}
            />
            <MiniMap
              style={{
                background: 'var(--color-surface)',
                border:     '1px solid var(--color-border)',
              }}
              nodeColor={n => TYPE_COLOR[(n.data as any)?.type ?? ''] ?? '#5a6080'}
            />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
