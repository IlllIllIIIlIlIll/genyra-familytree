import { z } from 'zod'

export const GenderSchema = z.enum(['MALE', 'FEMALE'])
export type Gender = z.infer<typeof GenderSchema>

export const UserRoleSchema = z.enum(['FAMILY_MEMBER', 'FAMILY_HEAD'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const MemberStatusSchema = z.enum(['PENDING_APPROVAL', 'ACTIVE', 'DEACTIVATED'])
export type MemberStatus = z.infer<typeof MemberStatusSchema>

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(100),
  gender: GenderSchema,
  surname: z
    .string()
    .min(1)
    .max(50)
    .regex(/^\S+$/, 'Surname must be a single word with no spaces'),
  nik: z
    .string()
    .length(16)
    .regex(/^\d{16}$/, 'NIK must be exactly 16 digits'),
  birthDate: z.string().datetime(),
  birthPlace: z.string().min(1).max(100),
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
  displayName: z.string(),
  gender: GenderSchema,
  surname: z.string(),
  nik: z.string(),
  birthDate: z.string().datetime(),
  birthPlace: z.string(),
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

// ─── Family Setup ───────────────────────────────────────────────────────────
// Called after registration to create the family with at least 2 parents.

export const CreateFamilyWithParentsSchema = z.object({
  familyName: z.string().min(1).max(100),
  userIsParent: z.enum(['FATHER', 'MOTHER']),
  // The OTHER parent (the one who isn't the user)
  otherParentName: z.string().min(1).max(100),
  otherParentSurname: z
    .string()
    .max(50)
    .regex(/^\S+$/, 'Surname must be a single word')
    .optional(),
})
export type CreateFamilyWithParentsDto = z.infer<typeof CreateFamilyWithParentsSchema>
