import { z } from 'zod'

export const RelationshipTypeSchema = z.enum(['PARENT_CHILD', 'SPOUSE', 'SIBLING'])
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>

export const RelationshipEdgeSchema = z.object({
  id: z.string(),
  relationshipType: RelationshipTypeSchema,
  sourceId: z.string(),
  targetId: z.string(),
  marriageDate: z.string().datetime().nullable(),
  divorceDate: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
})
export type RelationshipEdge = z.infer<typeof RelationshipEdgeSchema>

export const CreateRelationshipSchema = z.object({
  relationshipType: RelationshipTypeSchema,
  sourceId: z.string(),
  targetId: z.string(),
  marriageDate: z.string().datetime().optional(),
  divorceDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})
export type CreateRelationshipDto = z.infer<typeof CreateRelationshipSchema>
