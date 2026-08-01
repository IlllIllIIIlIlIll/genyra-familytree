"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectNikSchema = exports.SelectAdminSchema = exports.GoogleExchangeResponseSchema = exports.NikPersonaSchema = exports.UserSchema = exports.LinkAccountSchema = exports.CreateNikIdentitySchema = exports.NikLinkSchema = exports.NikIdentitySchema = exports.AccountSchema = exports.MemberStatusSchema = exports.GenderSchema = void 0;
const zod_1 = require("zod");
exports.GenderSchema = zod_1.z.enum(['MALE', 'FEMALE']);
exports.MemberStatusSchema = zod_1.z.enum(['ACTIVE', 'DEACTIVATED']);
// ─── Account (Google-authenticated login identity) ─────────────────────────
exports.AccountSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string(),
    name: zod_1.z.string().nullable(),
    avatarUrl: zod_1.z.string().nullable(),
    isAdmin: zod_1.z.boolean(),
    createdAt: zod_1.z.string().datetime(),
});
// ─── NikIdentity (one real person, keyed by government NIK) ────────────────
exports.NikIdentitySchema = zod_1.z.object({
    nik: zod_1.z.string(),
    status: exports.MemberStatusSchema,
    createdAt: zod_1.z.string().datetime(),
});
exports.NikLinkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    accountId: zod_1.z.string(),
    nik: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
exports.CreateNikIdentitySchema = zod_1.z.object({
    nik: zod_1.z.string().length(16, 'NIK must be exactly 16 digits').regex(/^\d{16}$/, 'NIK must be exactly 16 digits'),
    displayName: zod_1.z.string().min(1, 'Full name is required').max(100),
    gender: exports.GenderSchema.optional().nullable(),
    surname: zod_1.z.string().max(50).regex(/^\S+$/, 'Nickname must be a single word').optional().nullable(),
    birthDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date').optional().nullable(),
    birthPlace: zod_1.z.string().max(100).optional().nullable(),
    isDeceased: zod_1.z.boolean().optional().default(false),
    deathDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date').optional().nullable(),
});
exports.LinkAccountSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please enter a valid email address'),
});
// ─── Current-session personal profile (GET /users/me) ──────────────────────
exports.UserSchema = zod_1.z.object({
    nik: zod_1.z.string(),
    status: exports.MemberStatusSchema,
    familyGroupId: zod_1.z.string().nullable(),
    displayName: zod_1.z.string(),
    gender: exports.GenderSchema.nullable(),
    surname: zod_1.z.string().nullable(),
    birthDate: zod_1.z.string().nullable(),
    birthPlace: zod_1.z.string().nullable(),
});
// ─── Google OAuth exchange flow ─────────────────────────────────────────────
exports.NikPersonaSchema = zod_1.z.object({
    nik: zod_1.z.string(),
    displayName: zod_1.z.string(),
    families: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string(), name: zod_1.z.string() })),
});
exports.GoogleExchangeResponseSchema = zod_1.z.object({
    isAdmin: zod_1.z.boolean(),
    sessionToken: zod_1.z.string(),
    personas: zod_1.z.array(exports.NikPersonaSchema),
});
exports.SelectAdminSchema = zod_1.z.object({
    sessionToken: zod_1.z.string().min(1),
});
exports.SelectNikSchema = zod_1.z.object({
    sessionToken: zod_1.z.string().min(1),
    nik: zod_1.z.string().min(1),
    familyGroupId: zod_1.z.string().min(1),
});
//# sourceMappingURL=user.types.js.map