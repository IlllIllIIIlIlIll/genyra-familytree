import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type {
  FamilyGroup,
  MapData,
  CreateFamilyGroupDto,
  CreateFamilyWithParentsDto,
  PersonNode,
  RelationshipEdge,
} from '@genyra/shared-types'

@Injectable()
export class FamilyGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFamilyGroupDto, creatorId: string): Promise<FamilyGroup> {
    const group = await this.prisma.familyGroup.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
      },
    })

    await this.prisma.user.update({
      where: { id: creatorId },
      data: {
        role: 'FAMILY_HEAD',
        status: 'ACTIVE',
        personNode: {
          update: { familyGroupId: group.id },
        },
      },
    })

    return this.toFamilyGroupDto(group)
  }

  /**
   * Creates the user's family with at least two parents.
   * The user themselves is one of the parents (FATHER or MOTHER).
   * The other parent is a placeholder PersonNode.
   * Relationships: father --PARENT_CHILD--> user's child node (future),
   * and father --SPOUSE--> mother.
   * For now we create the 3 nodes (user, father placeholder, mother placeholder)
   * and link them accordingly.
   */
  async createWithParents(
    dto: CreateFamilyWithParentsDto,
    creatorId: string,
  ): Promise<FamilyGroup> {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: { personNode: true },
    })
    if (!creator || !creator.personNode) throw new NotFoundException('User not found')
    if (creator.personNode.familyGroupId) throw new BadRequestException('User already has a family group')

    const group = await this.prisma.familyGroup.create({
      data: {
        name: dto.familyName,
      },
    })

    const groupId = group.id

    // Determine which parent the user is
    const userIsFather = dto.userIsParent === 'FATHER'

    // Update the user's own PersonNode with placement and group
    const userNode = await this.prisma.personNode.update({
      where: { id: creator.personNode.id },
      data: {
        familyGroupId: groupId,
        canvasX: userIsFather ? 0 : 300,
        canvasY: 0,
      },
    })

    // Create the other parent as a placeholder node
    const otherParentNode = await this.prisma.personNode.create({
      data: {
        displayName: dto.otherParentName,
        gender: userIsFather ? 'FEMALE' : 'MALE',
        surname: dto.otherParentSurname ?? null,
        isPlaceholder: true,
        familyGroupId: groupId,
        canvasX: userIsFather ? 300 : 0,
        canvasY: 0,
      },
    })

    // Link the two parents as SPOUSE
    const fatherNode = userIsFather ? userNode : otherParentNode
    const motherNode = userIsFather ? otherParentNode : userNode

    await this.prisma.relationshipEdge.create({
      data: {
        relationshipType: 'SPOUSE',
        sourceId: fatherNode.id,
        targetId: motherNode.id,
      },
    })

    // Promote user to Family Head
    await this.prisma.user.update({
      where: { id: creatorId },
      data: {
        role: 'FAMILY_HEAD',
        status: 'ACTIVE',
      },
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

    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { personNode: true },
    })
    if (!user || !user.personNode) throw new NotFoundException('User not found')
    if (user.personNode.familyGroupId) throw new BadRequestException('User is already in a family group')

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: requestingUserId },
        data: {
          status: 'PENDING_APPROVAL',
          personNode: {
            update: { familyGroupId: invite.familyGroupId },
          },
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
      include: { personNode: true },
    })
    if (!user || user.personNode?.familyGroupId !== groupId) {
      throw new ForbiddenException('Not a member of this family group')
    }

    const [group, personNodes, relationships] = await Promise.all([
      this.prisma.familyGroup.findUnique({ where: { id: groupId } }),
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
      gender: n.gender ?? null,
      surname: n.surname ?? null,
      nik: n.nik ?? null,
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

    return { familyName: group?.name ?? 'Family', nodes, edges }
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
