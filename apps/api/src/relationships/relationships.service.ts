import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { RelationshipEdge, CreateRelationshipDto } from '@genyra/shared-types'

@Injectable()
export class RelationshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRelationshipDto, requestingUserId: string): Promise<RelationshipEdge> {
    const headNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, role: 'FAMILY_HEAD', familyGroupId: { not: null } },
    })
    if (!headNode) {
      throw new ForbiddenException('Only Family Head can create relationships')
    }

    // C-01: Verify both nodes belong to the head's family
    const [sourceNode, targetNode] = await Promise.all([
      this.prisma.personNode.findUnique({ where: { id: dto.sourceId }, select: { familyGroupId: true } }),
      this.prisma.personNode.findUnique({ where: { id: dto.targetId }, select: { familyGroupId: true } }),
    ])
    if (
      sourceNode?.familyGroupId !== headNode.familyGroupId ||
      targetNode?.familyGroupId !== headNode.familyGroupId
    ) {
      throw new ForbiddenException('Both nodes must belong to your family')
    }

    const existing = await this.prisma.relationshipEdge.findFirst({
      where: {
        sourceId: dto.sourceId,
        targetId: dto.targetId,
        relationshipType: dto.relationshipType,
      },
    })
    if (existing) throw new ConflictException('Relationship already exists')

    // Validate SPOUSE relationships against family norms
    if (dto.relationshipType === 'SPOUSE') {
      const [source, target] = await Promise.all([
        this.prisma.personNode.findUnique({ where: { id: dto.sourceId } }),
        this.prisma.personNode.findUnique({ where: { id: dto.targetId } }),
      ])
      if (!source || !target) throw new NotFoundException('One or both PersonNodes not found')
      await this.assertNoLivingSpouse(source.id)
      await this.assertNoLivingSpouse(target.id)
      await this.validateSpouseRules(source, target)
    }

    const edge = await this.prisma.relationshipEdge.create({
      data: {
        relationshipType: dto.relationshipType,
        sourceId: dto.sourceId,
        targetId: dto.targetId,
        marriageDate: dto.marriageDate ? new Date(dto.marriageDate) : null,
        divorceDate:  dto.divorceDate  ? new Date(dto.divorceDate)  : null,
        notes: dto.notes ?? null,
      },
    })

    return this.toDto(edge)
  }

  async delete(id: string, requestingUserId: string): Promise<void> {
    const headNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, role: 'FAMILY_HEAD', familyGroupId: { not: null } },
    })
    if (!headNode) {
      throw new ForbiddenException('Only Family Head can delete relationships')
    }

    // C-01: Verify edge belongs to head's family
    const edge = await this.prisma.relationshipEdge.findUnique({
      where: { id },
      include: { source: { select: { familyGroupId: true } } },
    })
    if (!edge) throw new NotFoundException('Relationship not found')
    if (edge.source.familyGroupId !== headNode.familyGroupId) {
      throw new ForbiddenException('This relationship does not belong to your family')
    }

    await this.prisma.relationshipEdge.delete({ where: { id } })
  }

  // ── Private validation ────────────────────────────────────────────────────

  /**
   * Reject if the node already has a living (non-divorced, non-deceased) spouse.
   * A deceased spouse is fine — this allows remarriage after a partner dies.
   */
  private async assertNoLivingSpouse(nodeId: string): Promise<void> {
    const existingSpouseEdges = await this.prisma.relationshipEdge.findMany({
      where: {
        relationshipType: 'SPOUSE',
        divorceDate: null,  // not divorced
        OR: [{ sourceId: nodeId }, { targetId: nodeId }],
      },
      select: { sourceId: true, targetId: true },
    })

    for (const edge of existingSpouseEdges) {
      const partnerId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
      const partner   = await this.prisma.personNode.findUnique({
        where: { id: partnerId },
        select: { isDeceased: true },
      })
      if (partner && !partner.isDeceased) {
        throw new UnprocessableEntityException(
          'MARRIED: this person already has a living spouse',
        )
      }
    }
  }

  private async validateSpouseRules(
    source: { id: string; gender: string | null; birthDate: Date | null },
    target: { id: string; gender: string | null; birthDate: Date | null },
  ): Promise<void> {
    // Rule 1: Opposite sex only
    if (source.gender !== null && target.gender !== null) {
      if (source.gender === target.gender) {
        throw new UnprocessableEntityException('SAME_SEX: spouse nodes must be of opposite genders')
      }
    }

    // Rule 2: Age gap ≤ 25 years
    if (source.birthDate !== null && target.birthDate !== null) {
      const gap = Math.abs(
        source.birthDate.getFullYear() - target.birthDate.getFullYear(),
      )
      if (gap > 25) {
        throw new UnprocessableEntityException(
          `AGE_GAP: birth-year difference is ${gap} years (max 25)`,
        )
      }
    }

    // Rule 3: No shared blood ancestor within 3 generations (consanguinity)
    await this.assertNoCommonAncestor(source.id, target.id, 3)
  }

  /**
   * BFS upward through PARENT_CHILD edges from `nodeId` up to `maxDepth` levels.
   * Returns the set of ancestor node IDs (not including nodeId itself).
   */
  private async collectAncestors(nodeId: string, maxDepth: number): Promise<Set<string>> {
    const ancestors = new Set<string>()
    let frontier = [nodeId]

    for (let depth = 0; depth < maxDepth; depth++) {
      if (frontier.length === 0) break

      // Find all PARENT_CHILD edges where the child is in the current frontier
      const edges = await this.prisma.relationshipEdge.findMany({
        where: { relationshipType: 'PARENT_CHILD', targetId: { in: frontier } },
        select: { sourceId: true },
      })

      const parents    = edges.map((e) => e.sourceId)
      const newParents = parents.filter((id) => !ancestors.has(id))
      newParents.forEach((id) => ancestors.add(id))
      frontier = newParents
    }

    return ancestors
  }

  private async assertNoCommonAncestor(
    idA: string,
    idB: string,
    maxGenerations: number,
  ): Promise<void> {
    const [ancestorsA, ancestorsB] = await Promise.all([
      this.collectAncestors(idA, maxGenerations),
      this.collectAncestors(idB, maxGenerations),
    ])

    for (const id of ancestorsA) {
      if (ancestorsB.has(id)) {
        throw new UnprocessableEntityException(
          'CONSANGUINITY: nodes share a blood ancestor within 3 generations',
        )
      }
    }
  }

  private toDto(edge: {
    id: string
    relationshipType: string
    sourceId: string
    targetId: string
    marriageDate: Date | null
    divorceDate: Date | null
    notes: string | null
    createdAt: Date
  }): RelationshipEdge {
    return {
      id: edge.id,
      relationshipType: edge.relationshipType as RelationshipEdge['relationshipType'],
      sourceId:    edge.sourceId,
      targetId:    edge.targetId,
      marriageDate: edge.marriageDate?.toISOString() ?? null,
      divorceDate:  edge.divorceDate?.toISOString()  ?? null,
      notes:        edge.notes,
      createdAt:    edge.createdAt.toISOString(),
    }
  }
}
