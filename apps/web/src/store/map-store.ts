import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
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
  userId: string | null
  familyGroupId: string | null
  role: string | null
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void
  setUser: (user: { userId: string; familyGroupId: string | null; role: string }) => void
  setFamilyGroupId: (id: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      familyGroupId: null,
      role: null,
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      setUser: (user) =>
        set({ userId: user.userId, familyGroupId: user.familyGroupId, role: user.role }),
      setFamilyGroupId: (id) => set({ familyGroupId: id }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          familyGroupId: null,
          role: null,
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
