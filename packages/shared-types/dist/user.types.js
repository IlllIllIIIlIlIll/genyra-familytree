"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateFamilyWithParentsSchema = exports.UpdateUserSchema = exports.UserSchema = exports.LoginSchema = exports.JoinGroupSchema = exports.RegisterSchema = exports.MemberStatusSchema = exports.UserRoleSchema = exports.GenderSchema = void 0;
const zod_1 = require("zod");
exports.GenderSchema = zod_1.z.enum(['MALE', 'FEMALE']);
exports.UserRoleSchema = zod_1.z.enum(['FAMILY_MEMBER', 'FAMILY_HEAD']);
exports.MemberStatusSchema = zod_1.z.enum(['PENDING_APPROVAL', 'ACTIVE', 'DEACTIVATED']);
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
    displayName: zod_1.z.string().min(1).max(100),
    gender: exports.GenderSchema,
    surname: zod_1.z
        .string()
        .min(1)
        .max(50)
        .regex(/^\S+$/, 'Surname must be a single word with no spaces'),
    nik: zod_1.z
        .string()
        .length(16)
        .regex(/^\d{16}$/, 'NIK must be exactly 16 digits'),
    birthDate: zod_1.z.string().datetime(),
    birthPlace: zod_1.z.string().min(1).max(100),
});
exports.JoinGroupSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().min(1),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string(),
    gender: exports.GenderSchema,
    surname: zod_1.z.string(),
    nik: zod_1.z.string(),
    birthDate: zod_1.z.string().datetime(),
    birthPlace: zod_1.z.string(),
    role: exports.UserRoleSchema,
    status: exports.MemberStatusSchema,
    familyGroupId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
exports.UpdateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(8).max(100).optional(),
});
// ─── Family Setup ───────────────────────────────────────────────────────────
// Called after registration to create the family with at least 2 parents.
exports.CreateFamilyWithParentsSchema = zod_1.z.object({
    familyName: zod_1.z.string().min(1).max(100),
    userIsParent: zod_1.z.enum(['FATHER', 'MOTHER']),
    // The OTHER parent (the one who isn't the user)
    otherParentName: zod_1.z.string().min(1).max(100),
    otherParentSurname: zod_1.z
        .string()
        .max(50)
        .regex(/^\S+$/, 'Surname must be a single word')
        .optional(),
});
//# sourceMappingURL=user.types.js.map