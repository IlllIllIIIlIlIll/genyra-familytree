import { z } from 'zod'
import { PersonNodeSchema } from './person-node.types'
import { RelationshipEdgeSchema } from './relationship.types'

export const FamilyGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
})
export type FamilyGroup = z.infer<typeof FamilyGroupSchema>

export const CreateFamilyGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})
export type CreateFamilyGroupDto = z.infer<typeof CreateFamilyGroupSchema>

export const InviteStatusSchema = z.enum(['UNUSED', 'USED', 'EXPIRED'])
export type InviteStatus = z.infer<typeof InviteStatusSchema>

export const InviteSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: InviteStatusSchema,
  expiresAt: z.string().datetime(),
  familyGroupId: z.string(),
  createdAt: z.string().datetime(),
})
export type Invite = z.infer<typeof InviteSchema>

export const ValidateInviteSchema = z.object({
  code: z.string().min(1),
})
export type ValidateInviteDto = z.infer<typeof ValidateInviteSchema>

export const MapDataSchema = z.object({
  nodes: z.array(PersonNodeSchema),
  edges: z.array(RelationshipEdgeSchema),
})
export type MapData = z.infer<typeof MapDataSchema>

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})
export type AuthTokens = z.infer<typeof AuthTokensSchema>
