import { z } from 'zod'
import { PersonNodeSchema } from './person-node.types'
import { RelationshipEdgeSchema } from './relationship.types'

export const FamilyGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  adminAccountId: z.string(),
  createdAt: z.string().datetime(),
})
export type FamilyGroup = z.infer<typeof FamilyGroupSchema>

export const CreateAdminFamilyGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})
export type CreateAdminFamilyGroupDto = z.infer<typeof CreateAdminFamilyGroupSchema>

export const MapDataSchema = z.object({
  familyName: z.string(),
  nodes: z.array(PersonNodeSchema),
  edges: z.array(RelationshipEdgeSchema),
})
export type MapData = z.infer<typeof MapDataSchema>

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})
export type AuthTokens = z.infer<typeof AuthTokensSchema>

export const NotificationSchema = z.object({
  id:            z.string(),
  familyGroupId: z.string(),
  type:          z.string(),
  message:       z.string(),
  personNodeId:  z.string().nullable(),
  readAt:        z.string().datetime().nullable().optional(),
  createdAt:     z.string().datetime(),
})
export type Notification = z.infer<typeof NotificationSchema>

export const LeaveRequestSchema = z.object({
  id:            z.string(),
  nik:           z.string(),
  displayName:   z.string(),
  familyGroupId: z.string(),
  status:        z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  createdAt:     z.string().datetime(),
})
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>

export const FamilySummarySchema = z.object({
  id:   z.string(),
  name: z.string(),
})
export type FamilySummary = z.infer<typeof FamilySummarySchema>

export const AuditLogEntrySchema = z.object({
  id:             z.string(),
  familyGroupId:  z.string(),
  actorAccountId: z.string(),
  action:         z.string(),
  targetId:       z.string().nullable(),
  details:        z.string().nullable(),
  createdAt:      z.string().datetime(),
})
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>
