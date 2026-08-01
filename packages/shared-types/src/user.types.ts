import { z } from 'zod'

export const GenderSchema = z.enum(['MALE', 'FEMALE'])
export type Gender = z.infer<typeof GenderSchema>

export const MemberStatusSchema = z.enum(['ACTIVE', 'DEACTIVATED'])
export type MemberStatus = z.infer<typeof MemberStatusSchema>

// ─── Account (Google-authenticated login identity) ─────────────────────────

export const AccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isAdmin: z.boolean(),
  createdAt: z.string().datetime(),
})
export type Account = z.infer<typeof AccountSchema>

// ─── NikIdentity (one real person, keyed by government NIK) ────────────────

export const NikIdentitySchema = z.object({
  nik: z.string(),
  status: MemberStatusSchema,
  createdAt: z.string().datetime(),
})
export type NikIdentity = z.infer<typeof NikIdentitySchema>

export const NikLinkSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  nik: z.string(),
  createdAt: z.string().datetime(),
})
export type NikLink = z.infer<typeof NikLinkSchema>

export const CreateNikIdentitySchema = z.object({
  nik:         z.string().length(16, 'NIK must be exactly 16 digits').regex(/^\d{16}$/, 'NIK must be exactly 16 digits'),
  displayName: z.string().min(1, 'Full name is required').max(100),
  gender:      GenderSchema.optional().nullable(),
  surname:     z.string().max(50).regex(/^\S+$/, 'Nickname must be a single word').optional().nullable(),
  birthDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date').optional().nullable(),
  birthPlace:  z.string().max(100).optional().nullable(),
  isDeceased:  z.boolean().optional().default(false),
  deathDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date').optional().nullable(),
})
export type CreateNikIdentityDto = z.infer<typeof CreateNikIdentitySchema>

export const LinkAccountSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
export type LinkAccountDto = z.infer<typeof LinkAccountSchema>

// ─── Current-session personal profile (GET /users/me) ──────────────────────

export const UserSchema = z.object({
  nik: z.string(),
  status: MemberStatusSchema,
  familyGroupId: z.string().nullable(),
  displayName: z.string(),
  gender: GenderSchema.nullable(),
  surname: z.string().nullable(),
  birthDate: z.string().nullable(),
  birthPlace: z.string().nullable(),
})
export type User = z.infer<typeof UserSchema>

// ─── Google OAuth exchange flow ─────────────────────────────────────────────

export const NikPersonaSchema = z.object({
  nik: z.string(),
  displayName: z.string(),
  families: z.array(z.object({ id: z.string(), name: z.string() })),
})
export type NikPersona = z.infer<typeof NikPersonaSchema>

export const GoogleExchangeResponseSchema = z.object({
  isAdmin: z.boolean(),
  sessionToken: z.string(),
  personas: z.array(NikPersonaSchema),
})
export type GoogleExchangeResponse = z.infer<typeof GoogleExchangeResponseSchema>

export const SelectAdminSchema = z.object({
  sessionToken: z.string().min(1),
})
export type SelectAdminDto = z.infer<typeof SelectAdminSchema>

export const SelectNikSchema = z.object({
  sessionToken: z.string().min(1),
  nik: z.string().min(1),
  familyGroupId: z.string().min(1),
})
export type SelectNikDto = z.infer<typeof SelectNikSchema>
