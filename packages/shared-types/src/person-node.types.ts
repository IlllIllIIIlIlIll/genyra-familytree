import { z } from 'zod'
import { GenderSchema } from './user.types'

export const PersonNodeSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1).max(100),
  gender: GenderSchema.nullable(),
  surname: z.string().nullable(),
  nik: z.string().nullable(),
  birthDate: z.string().datetime().nullable(),
  birthPlace: z.string().max(200).nullable(),
  deathDate: z.string().datetime().nullable(),
  bio: z.string().max(2000).nullable(),
  avatarUrl: z.string().url().nullable(),
  isDeceased: z.boolean(),
  isPlaceholder: z.boolean(),
  canvasX: z.number(),
  canvasY: z.number(),
  userId: z.string().nullable(),
  familyGroupId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type PersonNode = z.infer<typeof PersonNodeSchema>


export const CreatePersonNodeSchema = z.object({
  displayName: z.string().min(1).max(100),
  birthDate: z.string().datetime().optional(),
  birthPlace: z.string().max(200).optional(),
  deathDate: z.string().datetime().optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  isDeceased: z.boolean().optional().default(false),
  isPlaceholder: z.boolean().optional().default(false),
  canvasX: z.number().optional().default(0),
  canvasY: z.number().optional().default(0),
  userId: z.string().optional(),
})
export type CreatePersonNodeDto = z.infer<typeof CreatePersonNodeSchema>

export const UpdatePersonNodeSchema = CreatePersonNodeSchema.partial()
export type UpdatePersonNodeDto = z.infer<typeof UpdatePersonNodeSchema>

export const UpdateCanvasPositionSchema = z.object({
  canvasX: z.number(),
  canvasY: z.number(),
})
export type UpdateCanvasPositionDto = z.infer<typeof UpdateCanvasPositionSchema>
