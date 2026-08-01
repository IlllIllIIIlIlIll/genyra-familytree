import { z } from 'zod';
export declare const PersonNodeSchema: z.ZodObject<{
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
}>;
export type PersonNode = z.infer<typeof PersonNodeSchema>;
export declare const CreatePersonNodeSchema: z.ZodObject<{
    displayName: z.ZodString;
    gender: z.ZodNullable<z.ZodOptional<z.ZodEnum<["MALE", "FEMALE"]>>>;
    surname: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    birthDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    birthPlace: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    deathDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bio: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isDeceased: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    isPlaceholder: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    canvasX: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    canvasY: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    nikId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    isDeceased: boolean;
    isPlaceholder: boolean;
    canvasX: number;
    canvasY: number;
    avatarUrl?: string | null | undefined;
    gender?: "MALE" | "FEMALE" | null | undefined;
    surname?: string | null | undefined;
    birthDate?: string | null | undefined;
    birthPlace?: string | null | undefined;
    deathDate?: string | null | undefined;
    bio?: string | null | undefined;
    nikId?: string | undefined;
}, {
    displayName: string;
    avatarUrl?: string | null | undefined;
    gender?: "MALE" | "FEMALE" | null | undefined;
    surname?: string | null | undefined;
    birthDate?: string | null | undefined;
    birthPlace?: string | null | undefined;
    isDeceased?: boolean | undefined;
    deathDate?: string | null | undefined;
    bio?: string | null | undefined;
    isPlaceholder?: boolean | undefined;
    canvasX?: number | undefined;
    canvasY?: number | undefined;
    nikId?: string | undefined;
}>;
export type CreatePersonNodeDto = z.infer<typeof CreatePersonNodeSchema>;
export declare const UpdatePersonNodeSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEnum<["MALE", "FEMALE"]>>>>;
    surname: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    birthDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    birthPlace: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    deathDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    bio: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    isDeceased: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    isPlaceholder: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    canvasX: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    canvasY: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    nikId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    avatarUrl?: string | null | undefined;
    displayName?: string | undefined;
    gender?: "MALE" | "FEMALE" | null | undefined;
    surname?: string | null | undefined;
    birthDate?: string | null | undefined;
    birthPlace?: string | null | undefined;
    isDeceased?: boolean | undefined;
    deathDate?: string | null | undefined;
    bio?: string | null | undefined;
    isPlaceholder?: boolean | undefined;
    canvasX?: number | undefined;
    canvasY?: number | undefined;
    nikId?: string | undefined;
}, {
    avatarUrl?: string | null | undefined;
    displayName?: string | undefined;
    gender?: "MALE" | "FEMALE" | null | undefined;
    surname?: string | null | undefined;
    birthDate?: string | null | undefined;
    birthPlace?: string | null | undefined;
    isDeceased?: boolean | undefined;
    deathDate?: string | null | undefined;
    bio?: string | null | undefined;
    isPlaceholder?: boolean | undefined;
    canvasX?: number | undefined;
    canvasY?: number | undefined;
    nikId?: string | undefined;
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
export declare const PersonPhotoSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodString;
    caption: z.ZodNullable<z.ZodString>;
    takenAt: z.ZodNullable<z.ZodString>;
    sortOrder: z.ZodNumber;
    personNodeId: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    url: string;
    caption: string | null;
    takenAt: string | null;
    sortOrder: number;
    personNodeId: string;
}, {
    id: string;
    createdAt: string;
    url: string;
    caption: string | null;
    takenAt: string | null;
    sortOrder: number;
    personNodeId: string;
}>;
export type PersonPhoto = z.infer<typeof PersonPhotoSchema>;
export declare const CreatePersonPhotoSchema: z.ZodObject<{
    personNodeId: z.ZodString;
    caption: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    takenAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    sortOrder: number;
    personNodeId: string;
    caption?: string | null | undefined;
    takenAt?: string | null | undefined;
}, {
    personNodeId: string;
    caption?: string | null | undefined;
    takenAt?: string | null | undefined;
    sortOrder?: number | undefined;
}>;
export type CreatePersonPhotoDto = z.infer<typeof CreatePersonPhotoSchema>;
export declare const AddChildSchema: z.ZodObject<{
    displayName: z.ZodString;
    gender: z.ZodOptional<z.ZodEnum<["MALE", "FEMALE"]>>;
    surname: z.ZodString;
    nik: z.ZodOptional<z.ZodString>;
    birthDate: z.ZodString;
    birthPlace: z.ZodString;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    surname: string;
    birthDate: string;
    birthPlace: string;
    nik?: string | undefined;
    gender?: "MALE" | "FEMALE" | undefined;
}, {
    displayName: string;
    surname: string;
    birthDate: string;
    birthPlace: string;
    nik?: string | undefined;
    gender?: "MALE" | "FEMALE" | undefined;
}>;
export type AddChildDto = z.infer<typeof AddChildSchema>;
//# sourceMappingURL=person-node.types.d.ts.map