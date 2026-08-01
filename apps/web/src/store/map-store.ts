import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FamilySummary } from '@genyra/shared-types'

// ─── Toast ────────────────────────────────────────────────────────────────────

export type ToastType = 'neutral' | 'success' | 'error'

interface ToastItem {
  id:      string
  message: string
  type:    ToastType
}

interface ToastState {
  toasts:  ToastItem[]
  toast:   (message: string, type?: ToastType, duration?: number) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  toast: (message, type = 'neutral', duration = 4000) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [{ id, message, type }, ...s.toasts] }))
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      duration,
    )
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  accountId: string | null
  isAdmin: boolean
  nik: string | null
  familyGroupId: string | null
  families: FamilySummary[]
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void
  setUser: (user: { accountId: string; isAdmin: boolean; nik: string | null; familyGroupId: string | null }) => void
  setFamilyGroupId: (id: string) => void
  setFamilies: (families: FamilySummary[]) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      accountId: null,
      isAdmin: false,
      nik: null,
      familyGroupId: null,
      families: [],
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) =>
        set({ accountId: user.accountId, isAdmin: user.isAdmin, nik: user.nik, familyGroupId: user.familyGroupId }),
      setFamilyGroupId: (id) => set({ familyGroupId: id }),
      setFamilies: (families) => set({ families }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          accountId: null,
          isAdmin: false,
          nik: null,
          familyGroupId: null,
          families: [],
        }),
    }),
    { name: 'genyra-auth' },
  ),
)

interface MapUIState {
  selectedNodeId: string | null
  isProfilePanelOpen: boolean
  isEditMode: boolean
  isCleanView: boolean
  setSelectedNode: (id: string | null) => void
  openProfilePanel: (id: string) => void
  closeProfilePanel: () => void
  setEditMode: (value: boolean) => void
  toggleCleanView: () => void
}

export const useMapUIStore = create<MapUIState>()((set) => ({
  selectedNodeId: null,
  isProfilePanelOpen: false,
  isEditMode: false,
  isCleanView: false,
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  openProfilePanel: (id) => set({ selectedNodeId: id, isProfilePanelOpen: true }),
  closeProfilePanel: () => set({ isProfilePanelOpen: false, selectedNodeId: null }),
  setEditMode: (value) => set({ isEditMode: value }),
  toggleCleanView: () => set((s) => ({ isCleanView: !s.isCleanView })),
}))
