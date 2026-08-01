"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilySummarySchema = exports.LeaveRequestSchema = exports.NotificationSchema = exports.AuthTokensSchema = exports.MapDataSchema = exports.CreateAdminFamilyGroupSchema = exports.FamilyGroupSchema = void 0;
const zod_1 = require("zod");
const person_node_types_1 = require("./person-node.types");
const relationship_types_1 = require("./relationship.types");
exports.FamilyGroupSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    adminAccountId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
exports.CreateAdminFamilyGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
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
exports.NotificationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    familyGroupId: zod_1.z.string(),
    type: zod_1.z.string(),
    message: zod_1.z.string(),
    personNodeId: zod_1.z.string().nullable(),
    readAt: zod_1.z.string().datetime().nullable().optional(),
    createdAt: zod_1.z.string().datetime(),
});
exports.LeaveRequestSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nik: zod_1.z.string(),
    displayName: zod_1.z.string(),
    familyGroupId: zod_1.z.string(),
    status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']),
    createdAt: zod_1.z.string().datetime(),
});
exports.FamilySummarySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
});
//# sourceMappingURL=api-response.types.js.map