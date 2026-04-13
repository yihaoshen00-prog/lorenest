import { create } from 'zustand'
import type { AnyNode } from '@shared/types'

interface EditorState {
  activeNode:     AnyNode | null
  isDirty:        boolean
  isSaving:       boolean
  backlinks:      AnyNode[]

  setActiveNode:  (node: AnyNode | null) => void
  setDirty:       (v: boolean) => void
  setSaving:      (v: boolean) => void
  setBacklinks:   (nodes: AnyNode[]) => void

  loadNode:       (id: string) => Promise<void>
  saveNode:       (patch: Partial<AnyNode>) => Promise<void>
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeNode: null,
  isDirty:    false,
  isSaving:   false,
  backlinks:  [],

  setActiveNode: (node) => set({ activeNode: node, isDirty: false }),
  setDirty:      (v)    => set({ isDirty: v }),
  setSaving:     (v)    => set({ isSaving: v }),
  setBacklinks:  (nodes) => set({ backlinks: nodes }),

  async loadNode(id) {
    const [node, backlinks] = await Promise.all([
      window.api.node.get(id),
      window.api.node.getBacklinks(id),
    ])
    set({ activeNode: node, backlinks, isDirty: false })
  },

  async saveNode(patch) {
    const { activeNode } = get()
    if (!activeNode) return
    set({ isSaving: true })
    try {
      const updated = await window.api.node.update(activeNode.id, patch)
      set({ activeNode: updated, isDirty: false, isSaving: false })
    } catch {
      set({ isSaving: false })
    }
  },
}))
