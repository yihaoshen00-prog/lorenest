import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { marked, type Tokens } from 'marked'

interface Props {
  content: string
  onWikiLinkClick?: (title: string) => void
}

/**
 * 渲染 Markdown 为 HTML，支持 [[双链]] 高亮与点击跳转
 */
export function MarkdownPreview({ content, onWikiLinkClick }: Props) {
  const { vaultId } = useParams<{ vaultId: string }>()
  const navigate    = useNavigate()

  // 预处理：把 [[Title]] 转成可识别的 HTML span，然后交给 marked
  const processedContent = useMemo(() => {
    return content.replace(/\[\[([^\]]+)\]\]/g, (_, title) =>
      `<span class="wiki-link" data-title="${title.replace(/"/g, '&quot;')}">[[${title}]]</span>`
    )
  }, [content])

  const html = useMemo(() => {
    marked.setOptions({ breaks: true, gfm: true })
    return marked.parse(processedContent) as string
  }, [processedContent])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const link = target.closest('.wiki-link') as HTMLElement | null
    if (link) {
      const title = link.dataset.title
      if (title && onWikiLinkClick) {
        onWikiLinkClick(title)
      } else if (title && vaultId) {
        // 通过标题搜索节点跳转
        window.api.node.search(title, { vaultId, limit: 1 }).then((nodes: any[]) => {
          if (nodes[0]) navigate(`/vault/${vaultId}/entity/${nodes[0].id}`)
        })
      }
    }
  }

  return (
    <div
      className="markdown-body h-full overflow-auto px-8 py-6 selectable"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
