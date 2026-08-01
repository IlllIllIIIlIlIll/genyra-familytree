import axios, { type AxiosInstance } from 'axios'
import { getAccessToken, saveTokens, clearTokens, getRefreshToken } from './auth'
import type {
  AuthTokens,
  PersonNode,
  CreatePersonNodeDto,
  UpdatePersonNodeDto,
  UpdateCanvasPositionDto,
  RelationshipEdge,
  CreateRelationshipDto,
  FamilyGroup,
  CreateAdminFamilyGroupDto,
  CreateNikIdentityDto,
  LinkAccountDto,
  MapData,
  User,
  MemberStatus,
  PersonPhoto,
  AddChildDto,
  Notification,
  LeaveRequest,
  FamilySummary,
  GoogleExchangeResponse,
} from '@genyra/shared-types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({ baseURL: API_URL })

  instance.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        !error.config?.url?.includes('/auth/')
      ) {
        const refreshToken = getRefreshToken()
        if (refreshToken) {
          try {
            const res = await axios.post<AuthTokens>(`${API_URL}/auth/refresh`, {
              refreshToken,
            })
            saveTokens(res.data.accessToken, res.data.refreshToken)
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${res.data.accessToken}`
              return instance.request(error.config)
            }
          } catch {
            clearTokens()
            window.location.href = '/login'
          }
        }
      }
      return Promise.reject(error)
    },
  )

  return instance
}

const http = createAxiosInstance()

// AdminMember mirrors apps/api/src/admin/admin.service.ts's AdminMember —
// not part of @genyra/shared-types since it's an admin-only response shape.
export interface AdminMember {
  node: PersonNode
  nik: string | null
  status: MemberStatus | null
  linkedAccounts: Array<{ id: string; email: string; hasLoggedIn: boolean }>
}

export const apiClient = {
  // ── Auth (Google OAuth) ────────────────────────────────────────────────────
  googleLoginUrl: (): string => `${API_URL}/auth/google`,

  exchangeGoogleCode: async (code: string): Promise<GoogleExchangeResponse> => {
    const { data } = await http.post<GoogleExchangeResponse>('/auth/exchange', { code })
    return data
  },

  selectAdmin: async (sessionToken: string): Promise<AuthTokens> => {
    const { data } = await http.post<AuthTokens>('/auth/select-admin', { sessionToken })
    return data
  },

  selectNik: async (sessionToken: string, nik: string, familyGroupId: string): Promise<AuthTokens> => {
    const { data } = await http.post<AuthTokens>('/auth/select-nik', { sessionToken, nik, familyGroupId })
    return data
  },

  logout: async (): Promise<void> => {
    await http.post('/auth/logout')
    clearTokens()
  },

  // ── Users (personal session) ───────────────────────────────────────────────
  getMe: async (): Promise<User> => {
    const { data } = await http.get<User>('/users/me')
    return data
  },

  // ── Family Groups ──────────────────────────────────────────────────────────
  getFamilyGroup: async (id: string): Promise<FamilyGroup> => {
    const { data } = await http.get<FamilyGroup>(`/family-groups/${id}`)
    return data
  },

  getMapData: async (familyGroupId: string): Promise<MapData> => {
    const { data } = await http.get<MapData>(`/family-groups/${familyGroupId}/map-data`)
    return data
  },

  // ── Person Nodes (self-service) ────────────────────────────────────────────
  getPersonNode: async (id: string): Promise<PersonNode> => {
    const { data } = await http.get<PersonNode>(`/person-nodes/${id}`)
    return data
  },

  updatePersonNode: async (id: string, dto: UpdatePersonNodeDto): Promise<PersonNode> => {
    const { data } = await http.patch<PersonNode>(`/person-nodes/${id}`, dto)
    return data
  },

  updateCanvasPosition: async (id: string, dto: UpdateCanvasPositionDto): Promise<PersonNode> => {
    const { data } = await http.patch<PersonNode>(`/person-nodes/${id}/canvas-position`, dto)
    return data
  },

  // Search persons in current family
  searchPersons: async (q: string): Promise<PersonNode[]> => {
    const { data } = await http.get<PersonNode[]>(`/person-nodes/search?q=${encodeURIComponent(q)}`)
    return data
  },

  // Add a child (requires spouse relationship on server side)
  addChild: async (dto: AddChildDto): Promise<PersonNode> => {
    const { data } = await http.post<PersonNode>('/person-nodes/add-child', dto)
    return data
  },

  // ── Person Photos — images stored as base64 data URLs directly in the DB ────
  getPersonPhotos: async (personNodeId: string): Promise<PersonPhoto[]> => {
    const { data } = await http.get<PersonPhoto[]>(`/person-nodes/${personNodeId}/photos`)
    return data
  },

  uploadPersonPhoto: async (
    personNodeId: string,
    dataUrl: string,
    caption?: string,
    takenAt?: string,
  ): Promise<PersonPhoto> => {
    const { data } = await http.post<PersonPhoto>('/person-photos', {
      personNodeId,
      dataUrl,
      caption:  caption  ?? null,
      takenAt:  takenAt  ?? null,
    })
    return data
  },

  deletePersonPhoto: async (id: string): Promise<void> => {
    await http.delete(`/person-photos/${id}`)
  },

  // ── Notifications ───────────────────────────────────────────────────────────
  getNotifications: async (): Promise<Notification[]> => {
    const { data } = await http.get<Notification[]>('/notifications/my-family')
    return data
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await http.patch(`/notifications/${id}/read`)
  },

  dismissNotification: async (id: string): Promise<void> => {
    await http.delete(`/notifications/${id}`)
  },

  // ── Multi-family (personal session) ─────────────────────────────────────────
  getMyFamilies: async (): Promise<FamilySummary[]> => {
    const { data } = await http.get<FamilySummary[]>('/auth/my-families')
    return data
  },

  switchFamily: async (familyGroupId: string): Promise<AuthTokens> => {
    const { data } = await http.post<AuthTokens>('/auth/switch-family', { familyGroupId })
    return data
  },

  // Leave family (member requesting to leave)
  requestLeaveFamily: async (familyGroupId: string): Promise<{ message: string }> => {
    const { data } = await http.post<{ message: string }>(`/family-groups/${familyGroupId}/leave`)
    return data
  },

  // Cancel own leave request
  cancelLeaveRequest: async (familyGroupId: string): Promise<{ message: string }> => {
    const { data } = await http.delete<{ message: string }>(`/family-groups/${familyGroupId}/leave`)
    return data
  },

  // ── Share token ──────────────────────────────────────────────────────────────
  createShareToken: async (): Promise<{ token: string; expiresAt: string }> => {
    const { data } = await http.post<{ token: string; expiresAt: string }>('/share/token')
    return data
  },

  getPublicMapData: async (token: string): Promise<{ familyName: string; nodes: PersonNode[]; edges: RelationshipEdge[] }> => {
    const { data } = await http.get<{ familyName: string; nodes: PersonNode[]; edges: RelationshipEdge[] }>(`/share/${token}`)
    return data
  },

  // ── Admin (isAdmin-only) ─────────────────────────────────────────────────────
  admin: {
    getFamily: async (): Promise<FamilyGroup> => {
      const { data } = await http.get<FamilyGroup>('/admin/family')
      return data
    },

    createFamily: async (dto: CreateAdminFamilyGroupDto): Promise<FamilyGroup> => {
      const { data } = await http.post<FamilyGroup>('/admin/family', dto)
      return data
    },

    updateFamily: async (name: string): Promise<FamilyGroup> => {
      const { data } = await http.patch<FamilyGroup>('/admin/family', { name })
      return data
    },

    deleteFamily: async (): Promise<{ message: string }> => {
      const { data } = await http.delete<{ message: string }>('/admin/family')
      return data
    },

    listMembers: async (): Promise<AdminMember[]> => {
      const { data } = await http.get<AdminMember[]>('/admin/members')
      return data
    },

    createNikIdentity: async (dto: CreateNikIdentityDto): Promise<PersonNode> => {
      const { data } = await http.post<PersonNode>('/admin/nik-identities', dto)
      return data
    },

    setNikStatus: async (nik: string, status: MemberStatus): Promise<{ message: string }> => {
      const { data } = await http.patch<{ message: string }>(`/admin/nik-identities/${nik}/status`, { status })
      return data
    },

    linkAccount: async (nik: string, dto: LinkAccountDto): Promise<{ message: string }> => {
      const { data } = await http.post<{ message: string }>(`/admin/nik-identities/${nik}/link-account`, dto)
      return data
    },

    unlinkAccount: async (nik: string, accountId: string): Promise<{ message: string }> => {
      const { data } = await http.delete<{ message: string }>(`/admin/nik-identities/${nik}/link-account/${accountId}`)
      return data
    },

    createPersonNode: async (dto: CreatePersonNodeDto): Promise<PersonNode> => {
      const { data } = await http.post<PersonNode>('/admin/person-nodes', dto)
      return data
    },

    updatePersonNode: async (id: string, dto: UpdatePersonNodeDto): Promise<PersonNode> => {
      const { data } = await http.patch<PersonNode>(`/admin/person-nodes/${id}`, dto)
      return data
    },

    deletePersonNode: async (id: string): Promise<void> => {
      await http.delete(`/admin/person-nodes/${id}`)
    },

    createRelationship: async (dto: CreateRelationshipDto): Promise<RelationshipEdge> => {
      const { data } = await http.post<RelationshipEdge>('/admin/relationships', dto)
      return data
    },

    deleteRelationship: async (id: string): Promise<void> => {
      await http.delete(`/admin/relationships/${id}`)
    },

    getLeaveRequests: async (): Promise<LeaveRequest[]> => {
      const { data } = await http.get<LeaveRequest[]>('/admin/leave-requests')
      return data
    },

    processLeaveRequest: async (requestId: string, approve: boolean): Promise<{ message: string }> => {
      const { data } = await http.patch<{ message: string }>(`/admin/leave-requests/${requestId}`, { approve })
      return data
    },
  },
}
