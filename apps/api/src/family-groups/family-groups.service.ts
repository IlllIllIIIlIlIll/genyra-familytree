import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { FamilyGroup, MapData, CreateFamilyGroupDto, PersonNode, RelationshipEdge } from '@genyra/shared-types'

@Injectable()
export class FamilyGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFamilyGroupDto, creatorId: string): Promise<FamilyGroup> {
    const group = await this.prisma.familyGroup.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        members: {
          connect: { id: creatorId },
        },
      },
    })

    // Promote the creator to Family Head
    await this.prisma.user.update({
      where: { id: creatorId },
      data: { role: 'FAMILY_HEAD', status: 'ACTIVE', familyGroupId: group.id },
    })

    return this.toFamilyGroupDto(group)
  }

  async findById(id: string): Promise<FamilyGroup> {
    const group = await this.prisma.familyGroup.findUnique({ where: { id } })
    if (!group) throw new NotFoundException('Family group not found')
    return this.toFamilyGroupDto(group)
  }

  async join(dto: { inviteCode: string }, requestingUserId: string): Promise<{ message: string }> {
    const invite = await this.prisma.invite.findUnique({
      where: { code: dto.inviteCode },
    })

    if (!invite || invite.status !== 'UNUSED' || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite code')
    }

    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    if (!user) throw new NotFoundException('User not found')
    if (user.familyGroupId) throw new BadRequestException('User is already in a family group')

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: requestingUserId },
        data: {
          familyGroupId: invite.familyGroupId,
          status: 'PENDING_APPROVAL',
        },
      })

      // The previous registration logic captured a displayName which we don't have here. 
      // We will create the PersonNode using the email prefix or let them edit later.
      const defaultName = user.email.split('@')[0] || 'Unknown'
      await tx.personNode.create({
        data: {
          displayName: defaultName,
          userId: user.id,
          familyGroupId: invite.familyGroupId,
        },
      })

      await tx.invite.update({
        where: { id: invite.id },
        data: { status: 'USED', usedAt: new Date() },
      })
    })

    return { message: 'Successfully joined family group. Awaiting Family Head approval.' }
  }

  async getMapData(groupId: string, requestingUserId: string): Promise<MapData> {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
    })
    if (!user || user.familyGroupId !== groupId) {
      throw new ForbiddenException('Not a member of this family group')
    }

    const [personNodes, relationships] = await Promise.all([
      this.prisma.personNode.findMany({
        where: { familyGroupId: groupId },
        include: { photos: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      }),
      this.prisma.relationshipEdge.findMany({
        where: {
          source: { familyGroupId: groupId },
        },
      }),
    ])

    const nodes: PersonNode[] = personNodes.map((n) => ({
      id: n.id,
      displayName: n.displayName,
      birthDate: n.birthDate?.toISOString() ?? null,
      birthPlace: n.birthPlace ?? null,
      deathDate: n.deathDate?.toISOString() ?? null,
      bio: n.bio ?? null,
      avatarUrl: n.photos[0]?.url ?? n.avatarUrl ?? null,
      isDeceased: n.isDeceased,
      isPlaceholder: n.isPlaceholder,
      canvasX: n.canvasX,
      canvasY: n.canvasY,
      userId: n.userId ?? null,
      familyGroupId: n.familyGroupId,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }))

    const edges: RelationshipEdge[] = relationships.map((r) => ({
      id: r.id,
      relationshipType: r.relationshipType,
      sourceId: r.sourceId,
      targetId: r.targetId,
      marriageDate: r.marriageDate?.toISOString() ?? null,
      divorceDate: r.divorceDate?.toISOString() ?? null,
      notes: r.notes ?? null,
      createdAt: r.createdAt.toISOString(),
    }))

    return { nodes, edges }
  }

  private toFamilyGroupDto(group: {
    id: string
    name: string
    description: string | null
    createdAt: Date
  }): FamilyGroup {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt.toISOString(),
    }
  }
}
