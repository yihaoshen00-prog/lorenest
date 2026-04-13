import { create } from 'zustand'

type PanelView = 'properties' | 'backlinks' | 'attachments'
type SidebarTab = 'nav' | 'search' | 'tags'

interface UIState {
  sidebarWidth:   number
  sidebarTab:     SidebarTab
  rightPanelOpen: boolean
  rightPanelView: PanelView
  searchQuery:    string
  isSearchOpen:   boolean

  setSidebarWidth:   (w: number) => void
  setSidebarTab:     (tab: SidebarTab) => void
  setRightPanel:     (open: boolean, view?: PanelView) => void
  setSearchQuery:    (q: string) => void
  setSearchOpen:     (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth:   240,
  sidebarTab:     'nav',
  rightPanelOpen: true,
  rightPanelView: 'properties',
  searchQuery:    '',
  isSearchOpen:   false,

  setSidebarWidth:   (w)          => set({ sidebarWidth: w }),
  setSidebarTab:     (tab)        => set({ sidebarTab: tab }),
  setRightPanel:     (open, view) => set({ rightPanelOpen: open, ...(view ? { rightPanelView: view } : {}) }),
  setSearchQuery:    (q)          => set({ searchQuery: q }),
  setSearchOpen:     (v)          => set({ isSearchOpen: v }),
}))
