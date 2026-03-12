"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthTokensSchema = exports.MapDataSchema = exports.ValidateInviteSchema = exports.InviteSchema = exports.InviteStatusSchema = exports.CreateFamilyGroupSchema = exports.FamilyGroupSchema = void 0;
const zod_1 = require("zod");
const person_node_types_1 = require("./person-node.types");
const relationship_types_1 = require("./relationship.types");
exports.FamilyGroupSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
exports.CreateFamilyGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
});
exports.InviteStatusSchema = zod_1.z.enum(['UNUSED', 'USED', 'EXPIRED']);
exports.InviteSchema = zod_1.z.object({
    id: zod_1.z.string(),
    code: zod_1.z.string(),
    status: exports.InviteStatusSchema,
    expiresAt: zod_1.z.string().datetime(),
    familyGroupId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
exports.ValidateInviteSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
});
exports.MapDataSchema = zod_1.z.object({
    familyName: zod_1.z.string(),
    nodes: zod_1.z.array(person_node_types_1.PersonNodeSchema),
    edges: zod_1.z.array(relationship_types_1.RelationshipEdgeSchema),
});
exports.AuthTokensSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
});
//# sourceMappingURL=api-response.types.js.map