"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserSchema = exports.UserSchema = exports.LoginSchema = exports.JoinGroupSchema = exports.RegisterSchema = exports.MemberStatusSchema = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
exports.UserRoleSchema = zod_1.z.enum(['FAMILY_MEMBER', 'FAMILY_HEAD']);
exports.MemberStatusSchema = zod_1.z.enum(['PENDING_APPROVAL', 'ACTIVE', 'DEACTIVATED']);
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
    displayName: zod_1.z.string().min(1).max(100),
    birthDate: zod_1.z.string().datetime().optional(),
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
    role: exports.UserRoleSchema,
    status: exports.MemberStatusSchema,
    familyGroupId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
exports.UpdateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(8).max(100).optional(),
});
//# sourceMappingURL=user.types.js.map