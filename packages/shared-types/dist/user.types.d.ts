import { z } from 'zod';
export declare const GenderSchema: z.ZodEnum<["MALE", "FEMALE"]>;
export type Gender = z.infer<typeof GenderSchema>;
export declare const UserRoleSchema: z.ZodEnum<["FAMILY_MEMBER", "FAMILY_HEAD"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const MemberStatusSchema: z.ZodEnum<["PENDING_APPROVAL", "ACTIVE", "DEACTIVATED"]>;
export type MemberStatus = z.infer<typeof MemberStatusSchema>;
export declare const ReferrerRelationshipSchema: z.ZodEnum<["REFERRER_IS_FATHER", "REFERRER_IS_SON", "REFERRER_IS_DAUGHTER", "REFERRER_IS_SPOUSE", "REFERRER_IS_SIBLING"]>;
export type ReferrerRelationship = z.infer<typeof ReferrerRelationshipSchema>;
export declare const RegisterSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    password: z.ZodString;
    displayName: z.ZodString;
    gender: z.ZodEnum<["MALE", "FEMALE"]>;
    surname: z.ZodString;
    nik: z.ZodString;
    birthDate: z.ZodString;
    birthPlace: z.ZodString;
    inviteCode: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    referrerNik: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    referrerRelationship: z.ZodOptional<z.ZodEnum<["REFERRER_IS_FATHER", "REFERRER_IS_SON", "REFERRER_IS_DAUGHTER", "REFERRER_IS_SPOUSE", "REFERRER_IS_SIBLING"]>>;
    familyName: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    password: string;
    displayName: string;
    gender: "MALE" | "FEMALE";
    surname: string;
    nik: string;
    birthDate: string;
    birthPlace: string;
    inviteCode?: string | undefined;
    referrerNik?: string | undefined;
    referrerRelationship?: "REFERRER_IS_FATHER" | "REFERRER_IS_SON" | "REFERRER_IS_DAUGHTER" | "REFERRER_IS_SPOUSE" | "REFERRER_IS_SIBLING" | undefined;
    familyName?: string | undefined;
}, {
    password: string;
    displayName: string;
    gender: "MALE" | "FEMALE";
    surname: string;
    nik: string;
    birthDate: string;
    birthPlace: string;
    inviteCode?: unknown;
    referrerNik?: unknown;
    referrerRelationship?: "REFERRER_IS_FATHER" | "REFERRER_IS_SON" | "REFERRER_IS_DAUGHTER" | "REFERRER_IS_SPOUSE" | "REFERRER_IS_SIBLING" | undefined;
    familyName?: unknown;
}>, {
    password: string;
    displayName: string;
    gender: "MALE" | "FEMALE";
    surname: string;
    nik: string;
    birthDate: string;
    birthPlace: string;
    inviteCode?: string | undefined;
    referrerNik?: string | undefined;
    referrerRelationship?: "REFERRER_IS_FATHER" | "REFERRER_IS_SON" | "REFERRER_IS_DAUGHTER" | "REFERRER_IS_SPOUSE" | "REFERRER_IS_SIBLING" | undefined;
    familyName?: string | undefined;
}, {
    password: string;
    displayName: string;
    gender: "MALE" | "FEMALE";
    surname: string;
    nik: string;
    birthDate: string;
    birthPlace: string;
    inviteCode?: unknown;
    referrerNik?: unknown;
    referrerRelationship?: "REFERRER_IS_FATHER" | "REFERRER_IS_SON" | "REFERRER_IS_DAUGHTER" | "REFERRER_IS_SPOUSE" | "REFERRER_IS_SIBLING" | undefined;
    familyName?: unknown;
}>, {
    password: string;
    displayName: string;
    gender: "MALE" | "FEMALE";
    surname: string;
    nik: string;
    birthDate: string;
    birthPlace: string;
    inviteCode?: string | undefined;
    referrerNik?: string | undefined;
    referrerRelationship?: "REFERRER_IS_FATHER" | "REFERRER_IS_SON" | "REFERRER_IS_DAUGHTER" | "REFERRER_IS_SPOUSE" | "REFERRER_IS_SIBLING" | undefined;
    familyName?: string | undefined;
}, {
    password: string;
    displayName: string;
    gender: "MALE" | "FEMALE";
    surname: string;
    nik: string;
    birthDate: string;
    birthPlace: string;
    inviteCode?: unknown;
    referrerNik?: unknown;
    referrerRelationship?: "REFERRER_IS_FATHER" | "REFERRER_IS_SON" | "REFERRER_IS_DAUGHTER" | "REFERRER_IS_SPOUSE" | "REFERRER_IS_SIBLING" | undefined;
    familyName?: unknown;
}>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export declare const JoinGroupSchema: z.ZodObject<{
    inviteCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    inviteCode: string;
}, {
    inviteCode: string;
}>;
export type JoinGroupDto = z.infer<typeof JoinGroupSchema>;
export declare const LoginSchema: z.ZodObject<{
    nik: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    nik: string;
}, {
    password: string;
    nik: string;
}>;
export type LoginDto = z.infer<typeof LoginSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    nik: z.ZodString;
    role: z.ZodEnum<["FAMILY_MEMBER", "FAMILY_HEAD"]>;
    status: z.ZodEnum<["PENDING_APPROVAL", "ACTIVE", "DEACTIVATED"]>;
    familyGroupId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    displayName: z.ZodString;
    gender: z.ZodEnum<["MALE", "FEMALE"]>;
    surname: z.ZodString;
    birthDate: z.ZodString;
    birthPlace: z.ZodString;
    referrerNik: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    referrerRelationship: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING_APPROVAL" | "ACTIVE" | "DEACTIVATED";
    displayName: string;
    gender: "MALE" | "FEMALE";
    surname: string;
    nik: string;
    birthDate: string;
    birthPlace: string;
    id: string;
    role: "FAMILY_MEMBER" | "FAMILY_HEAD";
    familyGroupId: string | null;
    createdAt: string;
    referrerNik?: string | null | undefined;
    referrerRelationship?: string | null | undefined;
}, {
    status: "PENDING_APPROVAL" | "ACTIVE" | "DEACTIVATED";
    displayName: string;
    gender: "MALE" | "FEMALE";
    surname: string;
    nik: string;
    birthDate: string;
    birthPlace: string;
    id: string;
    role: "FAMILY_MEMBER" | "FAMILY_HEAD";
    familyGroupId: string | null;
    createdAt: string;
    referrerNik?: string | null | undefined;
    referrerRelationship?: string | null | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const UpdateUserSchema: z.ZodObject<{
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    password?: string | undefined;
}, {
    password?: string | undefined;
}>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export declare const CreateFamilyWithParentsSchema: z.ZodObject<{
    familyName: z.ZodString;
    userIsParent: z.ZodEnum<["FATHER", "MOTHER"]>;
    otherParentName: z.ZodString;
    otherParentSurname: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    familyName: string;
    userIsParent: "FATHER" | "MOTHER";
    otherParentName: string;
    otherParentSurname?: string | undefined;
}, {
    familyName: string;
    userIsParent: "FATHER" | "MOTHER";
    otherParentName: string;
    otherParentSurname?: string | undefined;
}>;
export type CreateFamilyWithParentsDto = z.infer<typeof CreateFamilyWithParentsSchema>;
//# sourceMappingURL=user.types.d.ts.map