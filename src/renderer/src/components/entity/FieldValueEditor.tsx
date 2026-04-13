import { useState, useRef, useEffect } from 'react'
import type { AnyNode, FieldDefinition, FieldValue } from '@shared/types'
import { NodePickerModal } from '../common/NodePickerModal'

interface Props {
  def:      FieldDefinition
  value:    FieldValue
  onChange: (val: FieldValue) => void
}

export function FieldValueEditor({ def, value, onChange }: Props) {
  switch (def.type) {
    case 'text':
      return (
        <input
          className="input text-xs py-1 px-2"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
        />
      )

    case 'textarea':
      return (
        <textarea
          className="input text-xs py-1 px-2 resize-none"
          rows={3}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
        />
      )

    case 'number':
      return (
        <input
          type="number"
          className="input text-xs py-1 px-2"
          value={(value as number) ?? ''}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder="—"
        />
      )

    case 'boolean':
      return (
        <button
          onClick={() => onChange(!value)}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs border transition-colors
            ${value
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10'
              : 'border-[var(--color-border2)] text-[var(--color-muted)] bg-transparent hover:border-[var(--color-muted)]'
            }`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)' }}>
          <span className={`w-2 h-2 border ${value ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-muted)]'}`} />
          {value ? '是' : '否'}
        </button>
      )

    case 'date':
      return (
        <input
          type="date"
          className="input text-xs py-1 px-2"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      )

    case 'select':
      return (
        <select
          className="input text-xs py-1 px-2"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}>
          <option value="">— 未选择 —</option>
          {(def.options ?? []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )

    case 'multiselect':
      return <MultiSelectEditor def={def} value={value as string[]} onChange={onChange} />

    case 'tags':
      return <TagsEditor value={value as string[]} onChange={onChange} />

    case 'reference':
      return <ReferenceEditor value={value as string} onChange={onChange} single />

    case 'reference_list':
      return <ReferenceEditor value={value as string} onChange={onChange} single={false} />

    default:
      return (
        <input
          className="input text-xs py-1 px-2"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
        />
      )
  }
}

/* ── 多选编辑器 ── */
function MultiSelectEditor({ def, value, onChange }: {
  def: FieldDefinition
  value: string[]
  onChange: (v: FieldValue) => void
}) {
  const current = Array.isArray(value) ? value : []
  const toggle = (opt: string) => {
    const next = current.includes(opt)
      ? current.filter(x => x !== opt)
      : [...current, opt]
    onChange(next)
  }
  return (
    <div className="flex flex-wrap gap-1">
      {(def.options ?? []).map(opt => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`text-[11px] px-1.5 py-0.5 border transition-colors font-mono
            ${current.includes(opt)
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10'
              : 'border-[var(--color-border2)] text-[var(--color-muted)] hover:border-[var(--color-muted2)]'
            }`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 0 100%)' }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ── 标签编辑器 ── */
function TagsEditor({ value, onChange }: { value: string[]; onChange: (v: FieldValue) => void }) {
  const tags = Array.isArray(value) ? value : []
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const t = input.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {tags.map(t => (
          <span key={t} className="badge-muted flex items-center gap-1">
            {t}
            <button
              onClick={() => onChange(tags.filter(x => x !== t))}
              className="text-[var(--color-muted)] hover:text-[var(--color-danger)] ml-0.5">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          ref={inputRef}
          className="input text-xs py-0.5 px-2 flex-1"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="输入后回车添加"
        />
        <button onClick={add} className="btn-ghost text-xs px-2 py-0.5">+</button>
      </div>
    </div>
  )
}

/* ── 引用编辑器（带节点搜索弹窗） ── */
function ReferenceEditor({ value, onChange, single }: {
  value:    string | string[]
  onChange: (v: FieldValue) => void
  single:   boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  if (single) {
    const title = (value as string) ?? ''
    return (
      <>
        <button
          onClick={() => setPickerOpen(true)}
          className="input text-xs py-1 px-2 font-mono text-left w-full flex items-center justify-between gap-2 hover:border-[var(--color-accent2)] transition-colors">
          <span className={title ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)] italic'}>
            {title || '点击选择节点…'}
          </span>
          {title && (
            <span
              onClick={e => { e.stopPropagation(); onChange('') }}
              className="text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors shrink-0 text-xs">
              ×
            </span>
          )}
        </button>
        <NodePickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(n: AnyNode) => onChange(n.title)}
          selectedTitles={title ? [title] : []}
        />
      </>
    )
  }

  // reference_list — 多选
  const titles = Array.isArray(value) ? value as string[] : []
  return (
    <>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1">
          {titles.map(t => (
            <span key={t} className="badge-cyan flex items-center gap-1">
              {t}
              <button
                onClick={() => onChange(titles.filter(x => x !== t))}
                className="text-[var(--color-muted)] hover:text-[var(--color-danger)] ml-0.5 transition-colors">
                ×
              </button>
            </span>
          ))}
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-accent2)] transition-colors">
          + 添加引用
        </button>
      </div>
      <NodePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(n: AnyNode) => {
          if (!titles.includes(n.title)) onChange([...titles, n.title])
        }}
        selectedTitles={titles}
      />
    </>
  )
}
