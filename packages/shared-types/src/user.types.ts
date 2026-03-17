import { z } from 'zod'

export const GenderSchema = z.enum(['MALE', 'FEMALE'])
export type Gender = z.infer<typeof GenderSchema>

export const UserRoleSchema = z.enum(['FAMILY_MEMBER', 'FAMILY_HEAD'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const MemberStatusSchema = z.enum(['PENDING_APPROVAL', 'ACTIVE', 'DEACTIVATED'])
export type MemberStatus = z.infer<typeof MemberStatusSchema>

// From the registrant's perspective: what is the referrer to them?
export const ReferrerRelationshipSchema = z.enum([
  'REFERRER_IS_FATHER',
  'REFERRER_IS_MOTHER',
  'REFERRER_IS_SON',
  'REFERRER_IS_DAUGHTER',
  'REFERRER_IS_SPOUSE',
  'REFERRER_IS_SIBLING',
])
export type ReferrerRelationship = z.infer<typeof ReferrerRelationshipSchema>

export const RegisterSchema = z.object({
  password:             z.string().min(8, 'Password must be at least 8 characters').max(100),
  displayName:          z.string().min(1, 'Full name is required').max(100),
  gender:               GenderSchema,
  surname:              z.string().min(1, 'Nickname is required').max(50).regex(/^\S+$/, 'Nickname must be a single word'),
  nik:                  z.string().length(16, 'NIK must be exactly 16 digits').regex(/^\d{16}$/, 'NIK must be exactly 16 digits'),
  birthDate:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date'),
  birthPlace:           z.string().min(1, 'Place of birth is required').max(100),
  // join path
  inviteCode:           z.string().optional(),
  referrerNik:          z.string().length(16, 'NIK must be exactly 16 digits').regex(/^\d{16}$/, 'NIK must be exactly 16 digits').optional(),
  referrerRelationship: ReferrerRelationshipSchema.optional(),
  // create path
  familyName:           z.string().min(1).max(100).optional(),
}).refine(
  (d) => !!(d.inviteCode ?? d.familyName),
  { message: 'Either an invite code or a family name is required', path: ['inviteCode'] },
).refine(
  (d) => !d.inviteCode || !!d.referrerNik,
  { message: 'Referrer NIK is required when joining a family', path: ['referrerNik'] },
)
export type RegisterDto = z.infer<typeof RegisterSchema>

export const JoinGroupSchema = z.object({
  inviteCode: z.string().min(1),
})
export type JoinGroupDto = z.infer<typeof JoinGroupSchema>

export const LoginSchema = z.object({
  nik: z.string().length(16).regex(/^\d{16}$/, 'NIK must be exactly 16 digits'),
  password: z.string().min(1),
})
export type LoginDto = z.infer<typeof LoginSchema>

export const UserSchema = z.object({
  id: z.string(),
  nik: z.string(),
  role: UserRoleSchema,
  status: MemberStatusSchema,
  familyGroupId: z.string().nullable(),
  createdAt: z.string().datetime(),
  // All identity fields now come from PersonNode
  displayName: z.string(),
  gender: GenderSchema,
  surname: z.string(),
  birthDate: z.string(),
  birthPlace: z.string(),
  // Referral info (only populated for pending members)
  referrerNik:          z.string().nullable().optional(),
  referrerRelationship: z.string().nullable().optional(),
})
export type User = z.infer<typeof UserSchema>

export const UpdateUserSchema = z.object({
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
