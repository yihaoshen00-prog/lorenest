/**
 * CodeMirror 6 [[双链]] 自动补全插件
 * 输入 [[ 后弹出当前 vault 所有节点标题的补全列表
 */
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'

let cachedTitles: string[] = []
let cacheVaultId  = ''
let cacheTimestamp = 0
const CACHE_TTL_MS = 30_000   // 30 秒后强制刷新

/** 在编辑器初始化或节点变更后调用，刷新缓存 */
export async function prefetchNodeTitles(vaultId: string, force = false) {
  const now = Date.now()
  if (!force && cacheVaultId === vaultId && cachedTitles.length > 0 && (now - cacheTimestamp) < CACHE_TTL_MS) return
  try {
    const nodes: any[] = await (window as any).api.node.list({ vaultId, limit: 2000 })
    cachedTitles  = nodes.map(n => n.title)
    cacheVaultId  = vaultId
    cacheTimestamp = now
  } catch {
    cachedTitles = []
  }
}

/** 节点创建/重命名/删除后调用，下次触发 [[ 时强制刷新 */
export function invalidateNodeTitleCache() {
  cacheTimestamp = 0
}

function wikiLinkSource(context: CompletionContext): CompletionResult | null {
  // 向前查找 [[ 触发符
  const before = context.matchBefore(/\[\[[^\]]*/)
  if (!before) return null

  // 提取用户已输入的过滤词（[[ 之后的部分）
  const query = before.text.slice(2).toLowerCase()

  const options = cachedTitles
    .filter(t => t.toLowerCase().includes(query))
    .slice(0, 100)
    .map(t => ({
      label:  t,
      apply:  (view: any, _: any, from: number, to: number) => {
        // 替换从 [[ 到光标的内容，补全为 [[Title]]
        const start = from - (before.text.length)
        view.dispatch({
          changes: { from: start, to, insert: `[[${t}]]` },
          selection: { anchor: start + t.length + 4 },
        })
      },
      detail: '双链节点',
    }))

  return {
    from:    before.from + 2,  // 从 [[ 后开始替换
    options,
    validFor: /^[^\]]*$/,
  }
}

export const wikiLinkCompletion = autocompletion({
  override: [wikiLinkSource],
  closeOnBlur: true,
  activateOnTyping: true,
})
