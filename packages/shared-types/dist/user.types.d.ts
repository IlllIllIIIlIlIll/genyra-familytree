import { z } from 'zod';
export declare const GenderSchema: z.ZodEnum<["MALE", "FEMALE"]>;
export type Gender = z.infer<typeof GenderSchema>;
export declare const MemberStatusSchema: z.ZodEnum<["ACTIVE", "DEACTIVATED"]>;
export type MemberStatus = z.infer<typeof MemberStatusSchema>;
export declare const AccountSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodString>;
    isAdmin: z.ZodBoolean;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    isAdmin: boolean;
    createdAt: string;
}, {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    isAdmin: boolean;
    createdAt: string;
}>;
export type Account = z.infer<typeof AccountSchema>;
export declare const NikIdentitySchema: z.ZodObject<{
    nik: z.ZodString;
    status: z.ZodEnum<["ACTIVE", "DEACTIVATED"]>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "DEACTIVATED";
    createdAt: string;
    nik: string;
}, {
    status: "ACTIVE" | "DEACTIVATED";
    createdAt: string;
    nik: string;
}>;
export type NikIdentity = z.infer<typeof NikIdentitySchema>;
export declare const NikLinkSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    nik: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    nik: string;
    accountId: string;
}, {
    id: string;
    createdAt: string;
    nik: string;
    accountId: string;
}>;
export type NikLink = z.infer<typeof NikLinkSchema>;
export declare const CreateNikIdentitySchema: z.ZodObject<{
    nik: z.ZodString;
    displayName: z.ZodString;
    gender: z.ZodNullable<z.ZodOptional<z.ZodEnum<["MALE", "FEMALE"]>>>;
    surname: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    birthDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    birthPlace: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isDeceased: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    deathDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    nik: string;
    displayName: string;
    isDeceased: boolean;
    gender?: "MALE" | "FEMALE" | null | undefined;
    surname?: string | null | undefined;
    birthDate?: string | null | undefined;
    birthPlace?: string | null | undefined;
    deathDate?: string | null | undefined;
}, {
    nik: string;
    displayName: string;
    gender?: "MALE" | "FEMALE" | null | undefined;
    surname?: string | null | undefined;
    birthDate?: string | null | undefined;
    birthPlace?: string | null | undefined;
    isDeceased?: boolean | undefined;
    deathDate?: string | null | undefined;
}>;
export type CreateNikIdentityDto = z.infer<typeof CreateNikIdentitySchema>;
export declare const LinkAccountSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type LinkAccountDto = z.infer<typeof LinkAccountSchema>;
export declare const UserSchema: z.ZodObject<{
    nik: z.ZodString;
    status: z.ZodEnum<["ACTIVE", "DEACTIVATED"]>;
    familyGroupId: z.ZodNullable<z.ZodString>;
    displayName: z.ZodString;
    gender: z.ZodNullable<z.ZodEnum<["MALE", "FEMALE"]>>;
    surname: z.ZodNullable<z.ZodString>;
    birthDate: z.ZodNullable<z.ZodString>;
    birthPlace: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "DEACTIVATED";
    nik: string;
    displayName: string;
    gender: "MALE" | "FEMALE" | null;
    surname: string | null;
    birthDate: string | null;
    birthPlace: string | null;
    familyGroupId: string | null;
}, {
    status: "ACTIVE" | "DEACTIVATED";
    nik: string;
    displayName: string;
    gender: "MALE" | "FEMALE" | null;
    surname: string | null;
    birthDate: string | null;
    birthPlace: string | null;
    familyGroupId: string | null;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const NikPersonaSchema: z.ZodObject<{
    nik: z.ZodString;
    displayName: z.ZodString;
    families: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    nik: string;
    displayName: string;
    families: {
        id: string;
        name: string;
    }[];
}, {
    nik: string;
    displayName: string;
    families: {
        id: string;
        name: string;
    }[];
}>;
export type NikPersona = z.infer<typeof NikPersonaSchema>;
export declare const GoogleExchangeResponseSchema: z.ZodObject<{
    isAdmin: z.ZodBoolean;
    sessionToken: z.ZodString;
    personas: z.ZodArray<z.ZodObject<{
        nik: z.ZodString;
        displayName: z.ZodString;
        families: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        nik: string;
        displayName: string;
        families: {
            id: string;
            name: string;
        }[];
    }, {
        nik: string;
        displayName: string;
        families: {
            id: string;
            name: string;
        }[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    isAdmin: boolean;
    sessionToken: string;
    personas: {
        nik: string;
        displayName: string;
        families: {
            id: string;
            name: string;
        }[];
    }[];
}, {
    isAdmin: boolean;
    sessionToken: string;
    personas: {
        nik: string;
        displayName: string;
        families: {
            id: string;
            name: string;
        }[];
    }[];
}>;
export type GoogleExchangeResponse = z.infer<typeof GoogleExchangeResponseSchema>;
export declare const SelectAdminSchema: z.ZodObject<{
    sessionToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionToken: string;
}, {
    sessionToken: string;
}>;
export type SelectAdminDto = z.infer<typeof SelectAdminSchema>;
export declare const SelectNikSchema: z.ZodObject<{
    sessionToken: z.ZodString;
    nik: z.ZodString;
    familyGroupId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nik: string;
    familyGroupId: string;
    sessionToken: string;
}, {
    nik: string;
    familyGroupId: string;
    sessionToken: string;
}>;
export type SelectNikDto = z.infer<typeof SelectNikSchema>;
//# sourceMappingURL=user.types.d.ts.map