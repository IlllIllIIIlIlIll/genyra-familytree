import { z } from 'zod';
export declare const FamilyGroupSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    adminAccountId: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: string;
    description: string | null;
    adminAccountId: string;
}, {
    id: string;
    name: string;
    createdAt: string;
    description: string | null;
    adminAccountId: string;
}>;
export type FamilyGroup = z.infer<typeof FamilyGroupSchema>;
export declare const CreateAdminFamilyGroupSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
}>;
export type CreateAdminFamilyGroupDto = z.infer<typeof CreateAdminFamilyGroupSchema>;
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
        nikId: z.ZodNullable<z.ZodString>;
        familyGroupId: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        avatarUrl: string | null;
        createdAt: string;
        nik: string | null;
        displayName: string;
        gender: "MALE" | "FEMALE" | null;
        surname: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        isDeceased: boolean;
        deathDate: string | null;
        familyGroupId: string | null;
        bio: string | null;
        isPlaceholder: boolean;
        canvasX: number;
        canvasY: number;
        nikId: string | null;
        updatedAt: string;
    }, {
        id: string;
        avatarUrl: string | null;
        createdAt: string;
        nik: string | null;
        displayName: string;
        gender: "MALE" | "FEMALE" | null;
        surname: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        isDeceased: boolean;
        deathDate: string | null;
        familyGroupId: string | null;
        bio: string | null;
        isPlaceholder: boolean;
        canvasX: number;
        canvasY: number;
        nikId: string | null;
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
        id: string;
        avatarUrl: string | null;
        createdAt: string;
        nik: string | null;
        displayName: string;
        gender: "MALE" | "FEMALE" | null;
        surname: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        isDeceased: boolean;
        deathDate: string | null;
        familyGroupId: string | null;
        bio: string | null;
        isPlaceholder: boolean;
        canvasX: number;
        canvasY: number;
        nikId: string | null;
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
        id: string;
        avatarUrl: string | null;
        createdAt: string;
        nik: string | null;
        displayName: string;
        gender: "MALE" | "FEMALE" | null;
        surname: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        isDeceased: boolean;
        deathDate: string | null;
        familyGroupId: string | null;
        bio: string | null;
        isPlaceholder: boolean;
        canvasX: number;
        canvasY: number;
        nikId: string | null;
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
export declare const NotificationSchema: z.ZodObject<{
    id: z.ZodString;
    familyGroupId: z.ZodString;
    type: z.ZodString;
    message: z.ZodString;
    personNodeId: z.ZodNullable<z.ZodString>;
    readAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: string;
    id: string;
    createdAt: string;
    familyGroupId: string;
    personNodeId: string | null;
    readAt?: string | null | undefined;
}, {
    message: string;
    type: string;
    id: string;
    createdAt: string;
    familyGroupId: string;
    personNodeId: string | null;
    readAt?: string | null | undefined;
}>;
export type Notification = z.infer<typeof NotificationSchema>;
export declare const LeaveRequestSchema: z.ZodObject<{
    id: z.ZodString;
    nik: z.ZodString;
    displayName: z.ZodString;
    familyGroupId: z.ZodString;
    status: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    id: string;
    createdAt: string;
    nik: string;
    displayName: string;
    familyGroupId: string;
}, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    id: string;
    createdAt: string;
    nik: string;
    displayName: string;
    familyGroupId: string;
}>;
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;
export declare const FamilySummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export type FamilySummary = z.infer<typeof FamilySummarySchema>;
export declare const AuditLogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    familyGroupId: z.ZodString;
    actorAccountId: z.ZodString;
    action: z.ZodString;
    targetId: z.ZodNullable<z.ZodString>;
    details: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    familyGroupId: string;
    targetId: string | null;
    actorAccountId: string;
    action: string;
    details: string | null;
}, {
    id: string;
    createdAt: string;
    familyGroupId: string;
    targetId: string | null;
    actorAccountId: string;
    action: string;
    details: string | null;
}>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
//# sourceMappingURL=api-response.types.d.ts.map