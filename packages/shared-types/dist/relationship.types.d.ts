import { z } from 'zod';
export declare const RelationshipTypeSchema: z.ZodEnum<["PARENT_CHILD", "SPOUSE", "SIBLING"]>;
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export declare const RelationshipEdgeSchema: z.ZodObject<{
    id: z.ZodString;
    relationshipType: z.ZodEnum<["PARENT_CHILD", "SPOUSE", "SIBLING"]>;
    sourceId: z.ZodString;
    targetId: z.ZodString;
    marriageDate: z.ZodNullable<z.ZodString>;
    divorceDate: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    relationshipType: "PARENT_CHILD" | "SPOUSE" | "SIBLING";
    sourceId: string;
    targetId: string;
    marriageDate: string | null;
    divorceDate: string | null;
    notes: string | null;
}, {
    id: string;
    createdAt: string;
    relationshipType: "PARENT_CHILD" | "SPOUSE" | "SIBLING";
    sourceId: string;
    targetId: string;
    marriageDate: string | null;
    divorceDate: string | null;
    notes: string | null;
}>;
export type RelationshipEdge = z.infer<typeof RelationshipEdgeSchema>;
export declare const CreateRelationshipSchema: z.ZodObject<{
    relationshipType: z.ZodEnum<["PARENT_CHILD", "SPOUSE", "SIBLING"]>;
    sourceId: z.ZodString;
    targetId: z.ZodString;
    marriageDate: z.ZodOptional<z.ZodString>;
    divorceDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    relationshipType: "PARENT_CHILD" | "SPOUSE" | "SIBLING";
    sourceId: string;
    targetId: string;
    marriageDate?: string | undefined;
    divorceDate?: string | undefined;
    notes?: string | undefined;
}, {
    relationshipType: "PARENT_CHILD" | "SPOUSE" | "SIBLING";
    sourceId: string;
    targetId: string;
    marriageDate?: string | undefined;
    divorceDate?: string | undefined;
    notes?: string | undefined;
}>;
export type CreateRelationshipDto = z.infer<typeof CreateRelationshipSchema>;
//# sourceMappingURL=relationship.types.d.ts.map