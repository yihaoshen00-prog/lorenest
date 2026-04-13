import { create } from 'zustand'
import type { Vault, FolderNode, AnyNode } from '@shared/types'

interface VaultState {
  // 仓库列表
  vaults:         Vault[]
  currentVault:   Vault | null

  // 导航树
  folders:        FolderNode[]
  activeNodeId:   string | null

  // 加载状态
  loading:        boolean
  error:          string | null

  // Actions
  setVaults:      (vaults: Vault[]) => void
  setCurrentVault:(vault: Vault | null) => void
  setFolders:     (folders: FolderNode[]) => void
  setActiveNode:  (id: string | null) => void
  setLoading:     (v: boolean) => void
  setError:       (msg: string | null) => void

  // Async actions (call window.api then update state)
  loadVaults:     () => Promise<void>
  openVault:      (id: string) => Promise<void>
  createVault:    (opts: { name: string; rootPath: string }) => Promise<Vault>
  loadFolders:    (vaultId: string) => Promise<void>
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaults:       [],
  currentVault: null,
  folders:      [],
  activeNodeId: null,
  loading:      false,
  error:        null,

  setVaults:       (vaults)  => set({ vaults }),
  setCurrentVault: (vault)   => set({ currentVault: vault }),
  setFolders:      (folders) => set({ folders }),
  setActiveNode:   (id)      => set({ activeNodeId: id }),
  setLoading:      (v)       => set({ loading: v }),
  setError:        (msg)     => set({ error: msg }),

  async loadVaults() {
    set({ loading: true, error: null })
    try {
      const vaults = await window.api.vault.list()
      set({ vaults, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  async openVault(id) {
    set({ loading: true })
    const vault = await window.api.vault.open(id)
    if (!vault) {
      set({ loading: false })
      throw new Error(`Vault ${id} not found`)
    }
    set({ currentVault: vault, loading: false })
    await get().loadFolders(id)
  },

  async createVault(opts) {
    const vault = await window.api.vault.create(opts)
    set(s => ({ vaults: [vault, ...s.vaults], currentVault: vault }))
    return vault
  },

  async loadFolders(vaultId) {
    const folders = await window.api.folder.list(vaultId)
    set({ folders })
  },
}))
