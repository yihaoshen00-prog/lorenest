import { useNavigate } from 'react-router-dom'
import type { Vault } from '@shared/types'

interface Props {
  vault:     Vault
  onSearch?: () => void
}

export function TitleBar({ vault, onSearch }: Props) {
  const navigate = useNavigate()

  return (
    <header
      className="flex items-center h-10 px-3 gap-3 bg-[var(--color-surface)] shrink-0 select-none relative"
      style={{
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 0 rgba(160,96,255,0.10)',
      } as any}>

      {/* 顶部双色装饰线：电紫 → 金 → 消散 */}
      <div className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(to right, var(--color-accent3), var(--color-accent) 35%, rgba(245,184,48,0.2) 65%, transparent)' }} />

      {/* Logo + 仓库名 */}
      <div className="flex items-center gap-2.5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* 菱形标志 */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div className="w-1.5 h-1.5 bg-[var(--color-accent)]" style={{ clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }} />
          <div className="w-1 h-1 bg-[var(--color-accent-dim)]" style={{ clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--color-accent)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>LORENEST</span>
        <div className="w-px h-3.5 bg-[var(--color-border2)]" />
        <span className="text-[11px] text-[var(--color-muted2)] max-w-[160px] truncate" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
          {vault.name}
        </span>
      </div>

      {/* 搜索触发器 */}
      {onSearch && (
        <button
          onClick={onSearch}
          className="flex items-center gap-2 px-3 py-1 transition-all mx-auto"
          style={{
            WebkitAppRegion: 'no-drag',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-muted)',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
            transition: 'border-color 0.15s, color 0.15s',
          } as any}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,160,32,0.45)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted2)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
          }}>
          <span style={{ fontSize: '13px', opacity: 0.7 }}>⌕</span>
          <span>搜索…</span>
          <kbd style={{
            marginLeft: '6px',
            padding: '1px 4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            background: 'var(--color-border)',
            border: '1px solid var(--color-border2)',
            color: 'var(--color-muted)',
          }}>Ctrl+K</kbd>
        </button>
      )}

      {/* 导航 */}
      <nav className="flex items-center gap-0.5 ml-auto shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <NavBtn onClick={() => navigate(`/vault/${vault.id}/workspace`)}    label="工作区" />
        <NavBtn onClick={() => navigate(`/vault/${vault.id}/db/character`)} label="角色" />
        <NavBtn onClick={() => navigate(`/vault/${vault.id}/db/location`)}  label="地点" />
        <NavBtn onClick={() => navigate(`/vault/${vault.id}/graph`)}        label="图谱" />
        <NavBtn onClick={() => navigate(`/vault/${vault.id}/timeline`)}    label="时间线" />
        <NavBtn onClick={() => navigate(`/vault/${vault.id}/stats`)}        label="统计" />
        <NavBtn onClick={() => navigate(`/vault/${vault.id}/settings`)}     label="设置" />
        <div className="w-px h-3.5 bg-[var(--color-border2)] mx-1" />
        <NavBtn onClick={() => navigate('/')} label="← 仓库" dim />
      </nav>
    </header>
  )
}

function NavBtn({ onClick, label, dim }: { onClick: () => void; label: string; dim?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '3px 8px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10.5px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: dim ? 'var(--color-muted)' : 'var(--color-muted2)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-accent)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = dim ? 'var(--color-muted)' : 'var(--color-muted2)')}>
      {label}
    </button>
  )
}
