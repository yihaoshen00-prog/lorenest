import { useState } from 'react'
import type { ImportPreview, ImportMode } from '@shared/types'

interface Props {
  onClose: () => void
  onDone:  (vaultId: string) => void
}

type Step = 'select' | 'preview' | 'options' | 'importing' | 'done'

export function ImportWizard({ onClose, onDone }: Props) {
  const [step,       setStep]       = useState<Step>('select')
  const [sourceRoot, setSourceRoot] = useState('')
  const [preview,    setPreview]    = useState<ImportPreview | null>(null)
  const [mode,       setMode]       = useState<ImportMode>('mirror_new_vault')
  const [vaultName,  setVaultName]  = useState('')
  const [progress,   setProgress]   = useState({ processed: 0, total: 0, current: '' })
  const [result,     setResult]     = useState<any>(null)
  const [error,      setError]      = useState('')

  const handleSelectDir = async () => {
    const dir = await window.api.dialog.openDir()
    if (!dir) return
    setSourceRoot(dir)
    setVaultName(dir.split(/[\\/]/).pop() ?? '导入仓库')
    // 执行预扫描
    try {
      const p = await window.api.import.preview(dir)
      setPreview(p)
      setStep('preview')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleStartImport = async () => {
    setStep('importing')
    const unsubProgress = window.api.import.onProgress((data: any) => {
      setProgress(data)
    })
    const unsubComplete = window.api.import.onComplete((res: any) => {
      setResult(res)
      setStep('done')
      unsubProgress()
    })

    try {
      await window.api.import.start({
        sourceRoot,
        mode,
        vaultName,
      })
    } catch (e: any) {
      setError(e.message)
      unsubProgress()
      unsubComplete()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text)]">从本地目录导入</h2>
          <button onClick={onClose} className="btn-ghost text-lg">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Step: select */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-muted)]">
                选择一个包含现有文件的本地目录，LoreNest 将递归扫描并保留原始文件夹层级。
              </p>
              <button onClick={handleSelectDir} className="btn-primary w-full justify-center py-3">
                📂 选择目录
              </button>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-[var(--color-text)] truncate">
                📂 {sourceRoot}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="文件夹" value={preview.totalFolders} />
                <Stat label="可导入文件" value={preview.supportedFiles} />
                <Stat label="不支持文件" value={preview.unsupportedFiles} color="text-yellow-500" />
                <Stat label="命名冲突" value={preview.conflicts.length} color={preview.conflicts.length > 0 ? 'text-red-400' : undefined} />
              </div>

              {/* 树预览（前20条） */}
              <div className="card p-3 text-xs text-[var(--color-muted)] max-h-48 overflow-y-auto font-mono">
                <TreePreview nodes={preview.tree} depth={0} maxItems={20} />
              </div>

              <button onClick={() => setStep('options')} className="btn-primary w-full justify-center">
                下一步：导入选项
              </button>
            </div>
          )}

          {/* Step: options */}
          {step === 'options' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">导入模式</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="mode" value="mirror_new_vault"
                      checked={mode === 'mirror_new_vault'}
                      onChange={() => setMode('mirror_new_vault')}
                      className="mt-0.5" />
                    <div>
                      <div className="text-sm text-[var(--color-text)]">镜像为新仓库</div>
                      <div className="text-xs text-[var(--color-muted)]">完整保留外部目录结构，创建全新仓库</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="mode" value="merge_into_existing"
                      checked={mode === 'merge_into_existing'}
                      onChange={() => setMode('merge_into_existing')}
                      className="mt-0.5" />
                    <div>
                      <div className="text-sm text-[var(--color-text)]">合并到现有仓库</div>
                      <div className="text-xs text-[var(--color-muted)]">导入内容到当前打开的仓库（当前版本需先打开仓库）</div>
                    </div>
                  </label>
                </div>
              </div>

              {mode === 'mirror_new_vault' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--color-text)]">仓库名称</label>
                  <input
                    className="input"
                    value={vaultName}
                    onChange={e => setVaultName(e.target.value)}
                  />
                </div>
              )}

              <button onClick={handleStartImport} className="btn-primary w-full justify-center py-2">
                开始导入
              </button>
            </div>
          )}

          {/* Step: importing */}
          {step === 'importing' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text)] font-medium">正在导入…</p>
              <div className="w-full bg-[var(--color-bg)] rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-200"
                  style={{ width: progress.total ? `${(progress.processed / progress.total) * 100}%` : '0%' }}
                />
              </div>
              <p className="text-xs text-[var(--color-muted)] truncate">
                {progress.processed} / {progress.total} — {progress.current}
              </p>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <p className="text-green-400 font-medium text-sm">✓ 导入完成</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="导入文档" value={result.importedDocuments} />
                <Stat label="导入文件夹" value={result.importedFolders} />
                <Stat label="失败文件" value={result.failedFiles?.length ?? 0}
                  color={result.failedFiles?.length > 0 ? 'text-red-400' : undefined} />
              </div>
              {result.failedFiles?.length > 0 && (
                <div className="card p-3 text-xs text-red-400 max-h-32 overflow-y-auto space-y-1">
                  {result.failedFiles.map((f: any, i: number) => (
                    <div key={i}>{f.path} — {f.reason}</div>
                  ))}
                </div>
              )}
              <button
                onClick={() => onDone(result.vaultId)}
                className="btn-primary w-full justify-center">
                进入仓库
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card px-3 py-2">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className={`text-lg font-bold ${color ?? 'text-[var(--color-text)]'}`}>{value}</div>
    </div>
  )
}

function TreePreview({ nodes, depth, maxItems }: { nodes: any[]; depth: number; maxItems: number }) {
  let count = 0
  const items: React.ReactNode[] = []
  for (const n of nodes) {
    if (count >= maxItems) { items.push(<div key="more">…（更多）</div>); break }
    items.push(
      <div key={n.path} style={{ paddingLeft: `${depth * 12}px` }}
        className={n.type === 'folder' ? 'text-blue-400' : 'text-[var(--color-muted)]'}>
        {n.type === 'folder' ? '📁 ' : '📄 '}{n.name}
        {n.suggestedEntityType && (
          <span className="text-purple-400 ml-1">[{n.suggestedEntityType}]</span>
        )}
      </div>
    )
    count++
    if (n.children?.length) {
      items.push(
        <TreePreview key={`${n.path}-c`} nodes={n.children} depth={depth + 1} maxItems={maxItems - count} />
      )
    }
  }
  return <>{items}</>
}
