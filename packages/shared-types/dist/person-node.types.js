"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePersonPhotoSchema = exports.PersonPhotoSchema = exports.UpdateCanvasPositionSchema = exports.UpdatePersonNodeSchema = exports.CreatePersonNodeSchema = exports.PersonNodeSchema = void 0;
const zod_1 = require("zod");
const user_types_1 = require("./user.types");
exports.PersonNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    displayName: zod_1.z.string().min(1).max(100),
    gender: user_types_1.GenderSchema.nullable(),
    surname: zod_1.z.string().nullable(),
    nik: zod_1.z.string().nullable(),
    birthDate: zod_1.z.string().datetime().nullable(),
    birthPlace: zod_1.z.string().max(200).nullable(),
    deathDate: zod_1.z.string().datetime().nullable(),
    bio: zod_1.z.string().max(2000).nullable(),
    avatarUrl: zod_1.z.string().nullable(),
    isDeceased: zod_1.z.boolean(),
    isPlaceholder: zod_1.z.boolean(),
    canvasX: zod_1.z.number(),
    canvasY: zod_1.z.number(),
    userId: zod_1.z.string().nullable(),
    familyGroupId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.CreatePersonNodeSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(100),
    gender: user_types_1.GenderSchema.optional().nullable(),
    surname: zod_1.z.string().max(50).optional().nullable(),
    birthDate: zod_1.z.string().datetime().optional().nullable(),
    birthPlace: zod_1.z.string().max(100).optional().nullable(),
    deathDate: zod_1.z.string().datetime().optional().nullable(),
    bio: zod_1.z.string().max(2000).optional().nullable(),
    avatarUrl: zod_1.z.string().optional().nullable(),
    isDeceased: zod_1.z.boolean().optional().default(false),
    isPlaceholder: zod_1.z.boolean().optional().default(false),
    canvasX: zod_1.z.number().optional().default(0),
    canvasY: zod_1.z.number().optional().default(0),
    userId: zod_1.z.string().optional(),
});
exports.UpdatePersonNodeSchema = exports.CreatePersonNodeSchema.partial();
exports.UpdateCanvasPositionSchema = zod_1.z.object({
    canvasX: zod_1.z.number(),
    canvasY: zod_1.z.number(),
});
exports.PersonPhotoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    url: zod_1.z.string().min(1),
    caption: zod_1.z.string().nullable(),
    takenAt: zod_1.z.string().datetime().nullable(),
    sortOrder: zod_1.z.number(),
    personNodeId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
exports.CreatePersonPhotoSchema = zod_1.z.object({
    personNodeId: zod_1.z.string(),
    caption: zod_1.z.string().max(500).optional().nullable(),
    takenAt: zod_1.z.string().datetime().optional().nullable(),
    sortOrder: zod_1.z.number().optional().default(0),
});
//# sourceMappingURL=person-node.types.js.map