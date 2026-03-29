import axios, { type AxiosInstance } from 'axios'
import { getAccessToken, saveTokens, clearTokens, getRefreshToken } from './auth'
import type {
  AuthTokens,
  LoginDto,
  RegisterDto,
  PersonNode,
  CreatePersonNodeDto,
  UpdatePersonNodeDto,
  UpdateCanvasPositionDto,
  RelationshipEdge,
  CreateRelationshipDto,
  FamilyGroup,
  CreateFamilyGroupDto,
  CreateFamilyWithParentsDto,
  JoinGroupDto,
  MapData,
  Invite,
  User,
  MemberStatus,
  PersonPhoto,
  AddChildDto,
  Notification,
  AdminBadge,
  LeaveRequest,
  FamilySummary,
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

export const apiClient = {
  // Auth
  login: async (dto: LoginDto): Promise<AuthTokens> => {
    const { data } = await http.post<AuthTokens>('/auth/login', dto)
    return data
  },

  register: async (dto: RegisterDto): Promise<{ message: string }> => {
    const { data } = await http.post<{ message: string }>('/auth/register', dto)
    return data
  },

  logout: async (): Promise<void> => {
    await http.post('/auth/logout')
    clearTokens()
  },

  // Users
  getMe: async (): Promise<User> => {
    const { data } = await http.get<User>('/users/me')
    return data
  },

  getPendingUsers: async (): Promise<User[]> => {
    const me = await apiClient.getMe()
    if (!me.familyGroupId) return []
    const { data } = await http.get<User[]>(`/users?familyGroupId=${me.familyGroupId}&status=PENDING_APPROVAL`)
    return data
  },

  getFamilyMembers: async (): Promise<User[]> => {
    const { data } = await http.get<User[]>('/users/members')
    return data
  },

  deleteUser: async (userId: string, headPassword: string): Promise<void> => {
    await http.delete(`/users/${userId}`, { data: { headPassword } })
  },

  updateUserStatus: async (userId: string, status: MemberStatus): Promise<User> => {
    const { data } = await http.patch<User>(`/users/${userId}/status`, { status })
    return data
  },

  // Family Groups
  createFamilyGroup: async (dto: CreateFamilyGroupDto): Promise<FamilyGroup> => {
    const { data } = await http.post<FamilyGroup>('/family-groups', dto)
    return data
  },

  createFamilyWithParents: async (dto: CreateFamilyWithParentsDto): Promise<FamilyGroup> => {
    const { data } = await http.post<FamilyGroup>('/family-groups/create-family', dto)
    return data
  },

  joinFamilyGroup: async (dto: JoinGroupDto): Promise<{ message: string }> => {
    const { data } = await http.post<{ message: string }>('/family-groups/join', dto)
    return data
  },

  getFamilyGroup: async (id: string): Promise<FamilyGroup> => {
    const { data } = await http.get<FamilyGroup>(`/family-groups/${id}`)
    return data
  },

  getMapData: async (familyGroupId: string): Promise<MapData> => {
    const { data } = await http.get<MapData>(`/family-groups/${familyGroupId}/map-data`)
    return data
  },

  // Person Nodes
  getPersonNode: async (id: string): Promise<PersonNode> => {
    const { data } = await http.get<PersonNode>(`/person-nodes/${id}`)
    return data
  },

  createPersonNode: async (dto: CreatePersonNodeDto): Promise<PersonNode> => {
    const { data } = await http.post<PersonNode>('/person-nodes', dto)
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

  deletePersonNode: async (id: string): Promise<void> => {
    await http.delete(`/person-nodes/${id}`)
  },

  // Person Photos — images stored as base64 data URLs directly in the DB
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

  // Relationships
  createRelationship: async (dto: CreateRelationshipDto): Promise<RelationshipEdge> => {
    const { data } = await http.post<RelationshipEdge>('/relationships', dto)
    return data
  },

  deleteRelationship: async (id: string): Promise<void> => {
    await http.delete(`/relationships/${id}`)
  },

  // Invites
  generateInvite: async (): Promise<Invite> => {
    const { data } = await http.post<Invite>('/invites/generate')
    return data
  },

  validateInvite: async (code: string): Promise<{ valid: boolean; familyGroupId?: string }> => {
    const { data } = await http.post<{ valid: boolean; familyGroupId?: string }>('/invites/validate', { code })
    return data
  },

  listInvites: async (groupId: string): Promise<Invite[]> => {
    const { data } = await http.get<Invite[]>(`/invites/group/${groupId}`)
    return data
  },

  // Add a child (requires spouse relationship on server side)
  addChild: async (dto: AddChildDto): Promise<PersonNode> => {
    const { data } = await http.post<PersonNode>('/person-nodes/add-child', dto)
    return data
  },

  // Approve a pending person node (Family Head only)
  approvePersonNode: async (id: string): Promise<PersonNode> => {
    const { data } = await http.patch<PersonNode>(`/person-nodes/${id}/approve`)
    return data
  },

  // Get pending person nodes for current family group (Family Head only)
  getPendingNodes: async (): Promise<PersonNode[]> => {
    const { data } = await http.get<PersonNode[]>('/users/pending-nodes')
    return data
  },

  // Get person nodes with no linked User account (Family Head only)
  getUnlinkedNodes: async (): Promise<PersonNode[]> => {
    const { data } = await http.get<PersonNode[]>('/person-nodes/unlinked')
    return data
  },

  // Invite — single family invite (get or create)
  getFamilyInvite: async (): Promise<Invite> => {
    const { data } = await http.get<Invite>('/invites/my-family')
    return data
  },

  // Refresh the family invite code
  refreshFamilyInvite: async (): Promise<Invite> => {
    const { data } = await http.patch<Invite>('/invites/my-family/refresh')
    return data
  },

  // Update family name (Family Head only)
  updateFamilyName: async (familyGroupId: string, name: string): Promise<FamilyGroup> => {
    const { data } = await http.patch<FamilyGroup>(`/family-groups/${familyGroupId}/name`, { name })
    return data
  },

  // Notifications
  getNotifications: async (): Promise<Notification[]> => {
    const { data } = await http.get<Notification[]>('/notifications/my-family')
    return data
  },

  // Admin badge: pending count + invite expired status (Family Head only)
  getAdminBadge: async (): Promise<AdminBadge> => {
    const { data } = await http.get<AdminBadge>('/users/pending-count')
    return data
  },

  // Multi-family
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

  // Leave requests (admin only)
  getLeaveRequests: async (familyGroupId: string): Promise<LeaveRequest[]> => {
    const { data } = await http.get<LeaveRequest[]>(`/family-groups/${familyGroupId}/leave-requests`)
    return data
  },

  processLeaveRequest: async (familyGroupId: string, requestId: string, approve: boolean): Promise<{ message: string }> => {
    const { data } = await http.patch<{ message: string }>(`/family-groups/${familyGroupId}/leave-requests/${requestId}`, { approve })
    return data
  },

  // Transfer family head ownership
  transferOwnership: async (familyGroupId: string, newHeadUserId: string): Promise<{ message: string }> => {
    const { data } = await http.post<{ message: string }>(`/family-groups/${familyGroupId}/transfer-ownership`, { newHeadUserId })
    return data
  },

  // Delete entire family (head only, last member)
  deleteFamily: async (familyGroupId: string): Promise<{ message: string }> => {
    const { data } = await http.delete<{ message: string }>(`/family-groups/${familyGroupId}`)
    return data
  },

  // Join an additional family (user already in another family)
  joinAdditionalFamily: async (inviteCode: string): Promise<{ message: string }> => {
    const { data } = await http.post<{ message: string }>('/family-groups/join-additional', { inviteCode })
    return data
  },

  // Admin NIK update
  adminUpdateNik: async (userId: string, nik: string): Promise<User> => {
    const { data } = await http.patch<User>(`/users/${userId}/nik`, { nik })
    return data
  },

  // Search persons in current family
  searchPersons: async (q: string): Promise<PersonNode[]> => {
    const { data } = await http.get<PersonNode[]>(`/person-nodes/search?q=${encodeURIComponent(q)}`)
    return data
  },

  // Cancel own leave request
  cancelLeaveRequest: async (familyGroupId: string): Promise<{ message: string }> => {
    const { data } = await http.delete<{ message: string }>(`/family-groups/${familyGroupId}/leave`)
    return data
  },

  // Mark notification as read
  markNotificationRead: async (id: string): Promise<void> => {
    await http.patch(`/notifications/${id}/read`)
  },

  // Dismiss (delete) a notification
  dismissNotification: async (id: string): Promise<void> => {
    await http.delete(`/notifications/${id}`)
  },

  // Share token
  createShareToken: async (): Promise<{ token: string; expiresAt: string }> => {
    const { data } = await http.post<{ token: string; expiresAt: string }>('/share/token')
    return data
  },

  getPublicMapData: async (token: string): Promise<{ familyName: string; nodes: PersonNode[]; edges: RelationshipEdge[] }> => {
    const { data } = await http.get<{ familyName: string; nodes: PersonNode[]; edges: RelationshipEdge[] }>(`/share/${token}`)
    return data
  },
}
