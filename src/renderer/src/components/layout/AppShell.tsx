import { useEffect, useState, useCallback } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { NavSidebar }      from './NavSidebar'
import { TitleBar }        from './TitleBar'
import { SearchPalette }   from '../common/SearchPalette'
import { useVaultStore }   from '../../stores/vault.store'
import { useUIStore }      from '../../stores/ui.store'
import { prefetchNodeTitles } from '../editor/WikiLinkPlugin'

export function AppShell() {
  const { vaultId } = useParams<{ vaultId: string }>()
  const navigate    = useNavigate()
  const { currentVault, openVault } = useVaultStore()
  const { sidebarWidth }            = useUIStore()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (vaultId && (!currentVault || currentVault.id !== vaultId)) {
      openVault(vaultId).catch(() => navigate('/'))
    }
  }, [vaultId])

  // 预热双链缓存
  useEffect(() => {
    if (vaultId) prefetchNodeTitles(vaultId)
  }, [vaultId])

  // 全局 Ctrl+K 快捷键
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(v => !v)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [handleGlobalKey])

  if (!currentVault) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] text-[var(--color-muted)] font-mono tracking-widest">LOADING VAULT</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TitleBar vault={currentVault} onSearch={() => setSearchOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <NavSidebar style={{ width: sidebarWidth, minWidth: sidebarWidth }} />
        <main className="flex-1 overflow-auto bg-[var(--color-bg)]">
          <Outlet />
        </main>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
