"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateFamilyWithParentsSchema = exports.UpdateUserSchema = exports.UserSchema = exports.LoginSchema = exports.JoinGroupSchema = exports.RegisterSchema = exports.ReferrerRelationshipSchema = exports.MemberStatusSchema = exports.UserRoleSchema = exports.GenderSchema = void 0;
const zod_1 = require("zod");
exports.GenderSchema = zod_1.z.enum(['MALE', 'FEMALE']);
exports.UserRoleSchema = zod_1.z.enum(['FAMILY_MEMBER', 'FAMILY_HEAD']);
exports.MemberStatusSchema = zod_1.z.enum(['PENDING_APPROVAL', 'ACTIVE', 'DEACTIVATED']);
// From the registrant's perspective: what is the referrer to them?
exports.ReferrerRelationshipSchema = zod_1.z.enum([
    'REFERRER_IS_FATHER',
    'REFERRER_IS_MOTHER',
    'REFERRER_IS_SON',
    'REFERRER_IS_DAUGHTER',
    'REFERRER_IS_SPOUSE',
    'REFERRER_IS_SIBLING',
]);
exports.RegisterSchema = zod_1.z.object({
    password: zod_1.z.string().min(8).max(100),
    displayName: zod_1.z.string().min(1).max(100),
    gender: exports.GenderSchema,
    surname: zod_1.z.string().min(1).max(50).regex(/^\S+$/, 'Surname must be a single word with no spaces'),
    nik: zod_1.z.string().length(16).regex(/^\d{16}$/, 'NIK must be exactly 16 digits'),
    birthDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    birthPlace: zod_1.z.string().min(1).max(100),
    // join path
    inviteCode: zod_1.z.string().optional(),
    referrerNik: zod_1.z.string().length(16).regex(/^\d{16}$/).optional(),
    referrerRelationship: exports.ReferrerRelationshipSchema.optional(),
    // create path
    familyName: zod_1.z.string().min(1).max(100).optional(),
}).refine((d) => !!(d.inviteCode ?? d.familyName), { message: 'Either an invite code or a family name is required', path: ['inviteCode'] });
exports.JoinGroupSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().min(1),
});
exports.LoginSchema = zod_1.z.object({
    nik: zod_1.z.string().length(16).regex(/^\d{16}$/, 'NIK must be exactly 16 digits'),
    password: zod_1.z.string().min(1),
});
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nik: zod_1.z.string(),
    role: exports.UserRoleSchema,
    status: exports.MemberStatusSchema,
    familyGroupId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
    // All identity fields now come from PersonNode
    displayName: zod_1.z.string(),
    gender: exports.GenderSchema,
    surname: zod_1.z.string(),
    birthDate: zod_1.z.string(),
    birthPlace: zod_1.z.string(),
    // Referral info (only populated for pending members)
    referrerNik: zod_1.z.string().nullable().optional(),
    referrerRelationship: zod_1.z.string().nullable().optional(),
});
exports.UpdateUserSchema = zod_1.z.object({
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