import { useEffect, useState } from 'react'
import { useNavigate }         from 'react-router-dom'
import { useVaultStore }       from '../../stores/vault.store'
import { ImportWizard }        from '../../components/import/ImportWizard'
import type { Vault }          from '@shared/types'

export function LaunchPage() {
  const navigate = useNavigate()
  const { vaults, loading, loadVaults, createVault } = useVaultStore()
  const [showImport, setShowImport] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [creating,   setCreating]   = useState(false)

  useEffect(() => { loadVaults() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const dir = await window.api.dialog.openDir()
    if (!dir) return
    setCreating(true)
    const vault = await createVault({ name: newName.trim(), rootPath: dir })
    navigate(`/vault/${vault.id}`)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-8 relative overflow-hidden">

      {/* 背景网格 — 靛蓝调 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(48,56,112,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(48,56,112,0.45) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
      }} />
      {/* 电紫点阵 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(160,96,255,0.14) 1px, transparent 1px)',
        backgroundSize: '52px 52px',
        backgroundPosition: '26px 26px',
      }} />
      {/* 左上角电紫光晕 */}
      <div className="absolute -top-32 -left-32 w-96 h-96 pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(160,96,255,0.12) 0%, transparent 70%)',
      }} />
      {/* 右下角金色光晕 */}
      <div className="absolute -bottom-20 -right-20 w-80 h-80 pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(245,184,48,0.09) 0%, transparent 70%)',
      }} />
      {/* 中心亮青放射 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 45% 35% at 50% 48%, rgba(0,232,204,0.05) 0%, transparent 70%)',
      }} />
      {/* 底部渐隐 */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(6,8,18,0.85), transparent)',
      }} />

      <div className="w-full max-w-lg relative z-10">

        {/* ── Logo 区 ── */}
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center gap-0">
            {/* 顶部装饰：双色线 + 电紫菱形 */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-1">
                <div className="h-px w-6" style={{ background: 'var(--color-border2)' }} />
                <div className="h-px w-10" style={{ background: 'linear-gradient(to right, var(--color-accent3), var(--color-accent))' }} />
              </div>
              <div className="relative w-3 h-3 flex items-center justify-center">
                <div className="absolute w-3 h-3 border border-[var(--color-accent3)]" style={{ transform: 'rotate(45deg)' }} />
                <div className="w-1.5 h-1.5 bg-[var(--color-accent)]" style={{ transform: 'rotate(45deg)' }} />
              </div>
              <div className="flex items-center gap-1">
                <div className="h-px w-10" style={{ background: 'linear-gradient(to left, var(--color-accent3), var(--color-accent))' }} />
                <div className="h-px w-6" style={{ background: 'var(--color-border2)' }} />
              </div>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '46px',
              fontWeight: 700,
              letterSpacing: '0.30em',
              /* 金色文字 + 淡紫色发光，制造"魔法档案"感 */
              color: 'var(--color-text)',
              textShadow: '0 0 40px rgba(160,96,255,0.20), 0 0 80px rgba(160,96,255,0.08)',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}>
              LORENEST
            </h1>

            {/* 双色分隔线 */}
            <div className="flex items-center gap-0 mt-3 mb-3 w-72">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--color-accent3) 50%, var(--color-accent))' }} />
              <div className="w-1 h-1 bg-[var(--color-accent)]" style={{ transform: 'rotate(45deg)', margin: '0 6px', flexShrink: 0 }} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, var(--color-accent3) 50%, var(--color-accent))' }} />
            </div>

            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9.5px',
              letterSpacing: '0.24em',
              color: 'var(--color-muted2)',
              textTransform: 'uppercase',
            }}>
              WORLDBUILDING · MANAGEMENT · SYSTEM
            </p>
          </div>
        </div>

        {/* ── 操作按钮 ── */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => { setShowCreate(true); setShowImport(false) }}
            className="btn-primary flex-1 justify-center py-2.5 text-sm">
            ＋ 新建仓库
          </button>
          <button
            onClick={() => { setShowImport(true); setShowCreate(false) }}
            className="btn-ghost flex-1 justify-center py-2.5 text-sm">
            ↑ 从目录导入
          </button>
        </div>

        {/* ── 新建表单 ── */}
        {showCreate && (
          <div className="card p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-[var(--color-accent)]" />
              <span className="text-sm font-bold text-[var(--color-text)]">新建仓库</span>
            </div>
            <input
              className="input text-sm"
              placeholder="仓库名称"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowCreate(false); setNewName('') }} className="btn-ghost text-xs">取消</button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary text-xs py-1.5">
                {creating ? '创建中…' : '选择目录并创建'}
              </button>
            </div>
          </div>
        )}

        {/* ── 最近仓库列表 ── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="section-label" style={{ letterSpacing: '0.22em' }}>RECENT VAULTS</span>
            <div className="flex-1 deco-line" />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] font-mono py-4">
              <div className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              LOADING…
            </div>
          )}

          {!loading && vaults.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <div className="w-10 h-10 border border-[var(--color-border2)] mx-auto flex items-center justify-center">
                <div className="w-4 h-4 border border-[var(--color-muted)] border-dashed" />
              </div>
              <p className="text-xs text-[var(--color-muted)] font-mono">// 暂无仓库记录</p>
            </div>
          )}

          <ul className="space-y-2">
            {vaults.map((v, i) => (
              <VaultCard key={v.id} vault={v} index={i} onClick={() => navigate(`/vault/${v.id}`)} />
            ))}
          </ul>
        </div>

        {/* 版本 */}
        <div className="mt-10 text-center flex items-center justify-center gap-3">
          <div className="h-px w-12" style={{ background: 'linear-gradient(to right, transparent, rgba(160,96,255,0.4))' }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.18em',
            color: 'var(--color-muted2)',
            textTransform: 'uppercase',
          }}>v0.1.0 · LOCAL FIRST</span>
          <div className="h-px w-12" style={{ background: 'linear-gradient(to left, transparent, rgba(160,96,255,0.4))' }} />
        </div>
      </div>

      {/* 导入向导 */}
      {showImport && (
        <ImportWizard
          onClose={() => setShowImport(false)}
          onDone={(vaultId) => navigate(`/vault/${vaultId}`)}
        />
      )}
    </div>
  )
}

function VaultCard({ vault, index, onClick }: { vault: Vault; index: number; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full card px-4 py-3 text-left group relative"
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,160,32,0.5)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
        <div className="flex items-start gap-3">
          {/* 序号 */}
          <span className="text-[10px] font-mono text-[var(--color-muted)] shrink-0 mt-0.5 w-4">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
              {vault.name}
            </div>
            <div className="text-[10px] font-mono text-[var(--color-muted)] mt-0.5 truncate">
              {vault.rootPath}
            </div>
          </div>
          <div className="shrink-0 text-right space-y-0.5">
            <div className="text-[10px] font-mono text-[var(--color-muted)]">
              {new Date(vault.updatedAt).toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
        {/* 右下角装饰 */}
        <div className="absolute bottom-0 right-0 w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'var(--color-accent)', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      </button>
    </li>
  )
}
