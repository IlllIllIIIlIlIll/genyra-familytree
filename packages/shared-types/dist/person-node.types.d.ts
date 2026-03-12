import { z } from 'zod';
export declare const PersonNodeSchema: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    birthDate: z.ZodNullable<z.ZodString>;
    birthPlace: z.ZodNullable<z.ZodString>;
    deathDate: z.ZodNullable<z.ZodString>;
    bio: z.ZodNullable<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodString>;
    isDeceased: z.ZodBoolean;
    isPlaceholder: z.ZodBoolean;
    canvasX: z.ZodNumber;
    canvasY: z.ZodNumber;
    userId: z.ZodNullable<z.ZodString>;
    familyGroupId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    displayName: string;
    birthDate: string | null;
    birthPlace: string | null;
    deathDate: string | null;
    bio: string | null;
    avatarUrl: string | null;
    isDeceased: boolean;
    isPlaceholder: boolean;
    canvasX: number;
    canvasY: number;
    userId: string | null;
    familyGroupId: string;
    createdAt: string;
    updatedAt: string;
}, {
    id: string;
    displayName: string;
    birthDate: string | null;
    birthPlace: string | null;
    deathDate: string | null;
    bio: string | null;
    avatarUrl: string | null;
    isDeceased: boolean;
    isPlaceholder: boolean;
    canvasX: number;
    canvasY: number;
    userId: string | null;
    familyGroupId: string;
    createdAt: string;
    updatedAt: string;
}>;
export type PersonNode = z.infer<typeof PersonNodeSchema>;
export declare const CreatePersonNodeSchema: z.ZodObject<{
    displayName: z.ZodString;
    birthDate: z.ZodOptional<z.ZodString>;
    birthPlace: z.ZodOptional<z.ZodString>;
    deathDate: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    isDeceased: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    isPlaceholder: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    canvasX: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    canvasY: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    userId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    isDeceased: boolean;
    isPlaceholder: boolean;
    canvasX: number;
    canvasY: number;
    birthDate?: string | undefined;
    birthPlace?: string | undefined;
    deathDate?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
    userId?: string | undefined;
}, {
    displayName: string;
    birthDate?: string | undefined;
    birthPlace?: string | undefined;
    deathDate?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
    isDeceased?: boolean | undefined;
    isPlaceholder?: boolean | undefined;
    canvasX?: number | undefined;
    canvasY?: number | undefined;
    userId?: string | undefined;
}>;
export type CreatePersonNodeDto = z.infer<typeof CreatePersonNodeSchema>;
export declare const UpdatePersonNodeSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    birthDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    birthPlace: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    deathDate: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bio: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isDeceased: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    isPlaceholder: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    canvasX: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    canvasY: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    userId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    birthDate?: string | undefined;
    birthPlace?: string | undefined;
    deathDate?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
    isDeceased?: boolean | undefined;
    isPlaceholder?: boolean | undefined;
    canvasX?: number | undefined;
    canvasY?: number | undefined;
    userId?: string | undefined;
}, {
    displayName?: string | undefined;
    birthDate?: string | undefined;
    birthPlace?: string | undefined;
    deathDate?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
    isDeceased?: boolean | undefined;
    isPlaceholder?: boolean | undefined;
    canvasX?: number | undefined;
    canvasY?: number | undefined;
    userId?: string | undefined;
}>;
export type UpdatePersonNodeDto = z.infer<typeof UpdatePersonNodeSchema>;
export declare const UpdateCanvasPositionSchema: z.ZodObject<{
    canvasX: z.ZodNumber;
    canvasY: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    canvasX: number;
    canvasY: number;
}, {
    canvasX: number;
    canvasY: number;
}>;
export type UpdateCanvasPositionDto = z.infer<typeof UpdateCanvasPositionSchema>;
//# sourceMappingURL=person-node.types.d.ts.map