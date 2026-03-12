import { Injectable, ForbiddenException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { RelationshipEdge, CreateRelationshipDto } from '@genyra/shared-types'

@Injectable()
export class RelationshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRelationshipDto, requestingUserId: string): Promise<RelationshipEdge> {
    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    if (user?.role !== 'FAMILY_HEAD') {
      throw new ForbiddenException('Only Family Head can create relationships')
    }

    const existing = await this.prisma.relationshipEdge.findFirst({
      where: {
        sourceId: dto.sourceId,
        targetId: dto.targetId,
        relationshipType: dto.relationshipType,
      },
    })
    if (existing) throw new ConflictException('Relationship already exists')

    const edge = await this.prisma.relationshipEdge.create({
      data: {
        relationshipType: dto.relationshipType,
        sourceId: dto.sourceId,
        targetId: dto.targetId,
        marriageDate: dto.marriageDate ? new Date(dto.marriageDate) : null,
        divorceDate: dto.divorceDate ? new Date(dto.divorceDate) : null,
        notes: dto.notes ?? null,
      },
    })

    return this.toDto(edge)
  }

  async delete(id: string, requestingUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    if (user?.role !== 'FAMILY_HEAD') {
      throw new ForbiddenException('Only Family Head can delete relationships')
    }
    await this.prisma.relationshipEdge.delete({ where: { id } })
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
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      marriageDate: edge.marriageDate?.toISOString() ?? null,
      divorceDate: edge.divorceDate?.toISOString() ?? null,
      notes: edge.notes,
      createdAt: edge.createdAt.toISOString(),
    }
  }
}
