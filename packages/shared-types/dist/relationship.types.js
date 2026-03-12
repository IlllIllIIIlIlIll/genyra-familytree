"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRelationshipSchema = exports.RelationshipEdgeSchema = exports.RelationshipTypeSchema = void 0;
const zod_1 = require("zod");
exports.RelationshipTypeSchema = zod_1.z.enum(['PARENT_CHILD', 'SPOUSE', 'SIBLING']);
exports.RelationshipEdgeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    relationshipType: exports.RelationshipTypeSchema,
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    marriageDate: zod_1.z.string().datetime().nullable(),
    divorceDate: zod_1.z.string().datetime().nullable(),
    notes: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime(),
});
exports.CreateRelationshipSchema = zod_1.z.object({
    relationshipType: exports.RelationshipTypeSchema,
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    marriageDate: zod_1.z.string().datetime().optional(),
    divorceDate: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
//# sourceMappingURL=relationship.types.js.map