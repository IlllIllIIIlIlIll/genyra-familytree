import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["FAMILY_MEMBER", "FAMILY_HEAD"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const MemberStatusSchema: z.ZodEnum<["PENDING_APPROVAL", "ACTIVE", "DEACTIVATED"]>;
export type MemberStatus = z.infer<typeof MemberStatusSchema>;
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
    birthDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    email: string;
    password: string;
    birthDate?: string | undefined;
}, {
    displayName: string;
    email: string;
    password: string;
    birthDate?: string | undefined;
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
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginDto = z.infer<typeof LoginSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["FAMILY_MEMBER", "FAMILY_HEAD"]>;
    status: z.ZodEnum<["PENDING_APPROVAL", "ACTIVE", "DEACTIVATED"]>;
    familyGroupId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    familyGroupId: string | null;
    createdAt: string;
    status: "PENDING_APPROVAL" | "ACTIVE" | "DEACTIVATED";
    email: string;
    role: "FAMILY_MEMBER" | "FAMILY_HEAD";
}, {
    id: string;
    familyGroupId: string | null;
    createdAt: string;
    status: "PENDING_APPROVAL" | "ACTIVE" | "DEACTIVATED";
    email: string;
    role: "FAMILY_MEMBER" | "FAMILY_HEAD";
}>;
export type User = z.infer<typeof UserSchema>;
export declare const UpdateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    password?: string | undefined;
}, {
    email?: string | undefined;
    password?: string | undefined;
}>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
//# sourceMappingURL=user.types.d.ts.map