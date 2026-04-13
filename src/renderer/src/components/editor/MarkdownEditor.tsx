import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState }    from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { completionKeymap } from '@codemirror/autocomplete'
import { markdown }       from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { wikiLinkCompletion } from './WikiLinkPlugin'

interface Props {
  value:    string
  onChange: (value: string) => void
  readOnly?: boolean
  vaultId?: string
}

const darkTheme = EditorView.theme({
  '&': {
    height:          '100%',
    backgroundColor: 'var(--color-bg)',
    color:           'var(--color-text)',
    fontSize:        '14px',
    fontFamily:      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  '.cm-content': {
    padding:    '20px 32px',
    maxWidth:   '820px',
    margin:     '0 auto',
    lineHeight: '1.85',
    caretColor: 'var(--color-accent)',
  },
  '.cm-focused': { outline: 'none' },
  '.cm-line':    { padding: '0' },
  '.cm-activeLine': { backgroundColor: 'rgba(232,160,32,0.04)' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-bg)',
    borderRight:     '1px solid var(--color-border)',
    color:           'var(--color-muted)',
    fontSize:        '11px',
    fontFamily:      'monospace',
    paddingRight:    '8px',
  },
  '.cm-cursor': { borderLeftColor: 'var(--color-accent)', borderLeftWidth: '2px' },
  // Markdown 高亮 — 鹰角配色
  '.tok-heading':    { color: '#e8c060', fontWeight: 'bold' },
  '.tok-link':       { color: 'var(--color-accent2)' },
  '.tok-url':        { color: 'var(--color-accent2)', textDecoration: 'underline' },
  '.tok-emphasis':   { fontStyle: 'italic', color: '#c8d0f0' },
  '.tok-strong':     { fontWeight: 'bold', color: '#e8e4d5' },
  '.tok-monospace':  { fontFamily: 'monospace', color: '#9cdcfe', background: 'rgba(0,200,232,0.06)' },
  '.tok-comment':    { color: '#4a6050' },
  // 补全弹窗
  '.cm-tooltip.cm-tooltip-autocomplete': {
    background:   'var(--color-surface2)',
    border:       '1px solid var(--color-border2)',
    borderRadius: '0',
    boxShadow:    '0 4px 24px rgba(0,0,0,0.6)',
    fontFamily:   'inherit',
    fontSize:     '13px',
  },
  '.cm-tooltip-autocomplete ul li': {
    padding:    '4px 10px',
    color:      'var(--color-muted2)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    background: 'rgba(232,160,32,0.12)',
    color:      'var(--color-accent)',
  },
  '.cm-completionLabel': { flex: 1 },
  '.cm-completionDetail': {
    color:    'var(--color-muted)',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
}, { dark: true })

export function MarkdownEditor({ value, onChange, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef      = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle),
        lineNumbers(),
        highlightActiveLine(),
        wikiLinkCompletion,
        darkTheme,
        EditorView.lineWrapping,
        EditorView.updateListener.of(update => {
          if (update.docChanged && !readOnly) {
            onChange(update.state.doc.toString())
          }
        }),
        EditorState.readOnly.of(readOnly),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentVal = view.state.doc.toString()
    if (currentVal !== value) {
      view.dispatch({
        changes: { from: 0, to: currentVal.length, insert: value },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className="h-full w-full selectable overflow-auto"
    />
  )
}
