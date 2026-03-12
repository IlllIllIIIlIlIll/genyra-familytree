import { z } from 'zod'

export const UserRoleSchema = z.enum(['FAMILY_MEMBER', 'FAMILY_HEAD'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const MemberStatusSchema = z.enum(['PENDING_APPROVAL', 'ACTIVE', 'DEACTIVATED'])
export type MemberStatus = z.infer<typeof MemberStatusSchema>

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(100),
  birthDate: z.string().datetime().optional(),
})
export type RegisterDto = z.infer<typeof RegisterSchema>

export const JoinGroupSchema = z.object({
  inviteCode: z.string().min(1),
})
export type JoinGroupDto = z.infer<typeof JoinGroupSchema>


export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginDto = z.infer<typeof LoginSchema>

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  status: MemberStatusSchema,
  familyGroupId: z.string().nullable(),
  createdAt: z.string().datetime(),
})
export type User = z.infer<typeof UserSchema>

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).max(100).optional(),
})
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>
