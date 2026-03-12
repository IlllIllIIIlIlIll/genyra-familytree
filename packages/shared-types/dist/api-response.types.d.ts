import { z } from 'zod';
export declare const FamilyGroupSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    name: string;
    description: string | null;
}, {
    id: string;
    createdAt: string;
    name: string;
    description: string | null;
}>;
export type FamilyGroup = z.infer<typeof FamilyGroupSchema>;
export declare const CreateFamilyGroupSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
}>;
export type CreateFamilyGroupDto = z.infer<typeof CreateFamilyGroupSchema>;
export declare const InviteStatusSchema: z.ZodEnum<["UNUSED", "USED", "EXPIRED"]>;
export type InviteStatus = z.infer<typeof InviteStatusSchema>;
export declare const InviteSchema: z.ZodObject<{
    id: z.ZodString;
    code: z.ZodString;
    status: z.ZodEnum<["UNUSED", "USED", "EXPIRED"]>;
    expiresAt: z.ZodString;
    familyGroupId: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    status: "UNUSED" | "USED" | "EXPIRED";
    id: string;
    familyGroupId: string;
    createdAt: string;
    expiresAt: string;
}, {
    code: string;
    status: "UNUSED" | "USED" | "EXPIRED";
    id: string;
    familyGroupId: string;
    createdAt: string;
    expiresAt: string;
}>;
export type Invite = z.infer<typeof InviteSchema>;
export declare const ValidateInviteSchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export type ValidateInviteDto = z.infer<typeof ValidateInviteSchema>;
export declare const MapDataSchema: z.ZodObject<{
    familyName: z.ZodString;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        gender: z.ZodNullable<z.ZodEnum<["MALE", "FEMALE"]>>;
        surname: z.ZodNullable<z.ZodString>;
        nik: z.ZodNullable<z.ZodString>;
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
        displayName: string;
        gender: "MALE" | "FEMALE" | null;
        surname: string | null;
        nik: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        id: string;
        familyGroupId: string;
        createdAt: string;
        deathDate: string | null;
        bio: string | null;
        avatarUrl: string | null;
        isDeceased: boolean;
        isPlaceholder: boolean;
        canvasX: number;
        canvasY: number;
        userId: string | null;
        updatedAt: string;
    }, {
        displayName: string;
        gender: "MALE" | "FEMALE" | null;
        surname: string | null;
        nik: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        id: string;
        familyGroupId: string;
        createdAt: string;
        deathDate: string | null;
        bio: string | null;
        avatarUrl: string | null;
        isDeceased: boolean;
        isPlaceholder: boolean;
        canvasX: number;
        canvasY: number;
        userId: string | null;
        updatedAt: string;
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    familyName: string;
    nodes: {
        displayName: string;
        gender: "MALE" | "FEMALE" | null;
        surname: string | null;
        nik: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        id: string;
        familyGroupId: string;
        createdAt: string;
        deathDate: string | null;
        bio: string | null;
        avatarUrl: string | null;
        isDeceased: boolean;
        isPlaceholder: boolean;
        canvasX: number;
        canvasY: number;
        userId: string | null;
        updatedAt: string;
    }[];
    edges: {
        id: string;
        createdAt: string;
        relationshipType: "PARENT_CHILD" | "SPOUSE" | "SIBLING";
        sourceId: string;
        targetId: string;
        marriageDate: string | null;
        divorceDate: string | null;
        notes: string | null;
    }[];
}, {
    familyName: string;
    nodes: {
        displayName: string;
        gender: "MALE" | "FEMALE" | null;
        surname: string | null;
        nik: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        id: string;
        familyGroupId: string;
        createdAt: string;
        deathDate: string | null;
        bio: string | null;
        avatarUrl: string | null;
        isDeceased: boolean;
        isPlaceholder: boolean;
        canvasX: number;
        canvasY: number;
        userId: string | null;
        updatedAt: string;
    }[];
    edges: {
        id: string;
        createdAt: string;
        relationshipType: "PARENT_CHILD" | "SPOUSE" | "SIBLING";
        sourceId: string;
        targetId: string;
        marriageDate: string | null;
        divorceDate: string | null;
        notes: string | null;
    }[];
}>;
export type MapData = z.infer<typeof MapDataSchema>;
export declare const AuthTokensSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    refreshToken: string;
}, {
    accessToken: string;
    refreshToken: string;
}>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
//# sourceMappingURL=api-response.types.d.ts.map