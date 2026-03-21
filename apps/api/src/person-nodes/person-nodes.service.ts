import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { NotificationsService } from '../notifications/notifications.service'

function sanitizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('https://')) return url
  return null
}
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PersonNode, CreatePersonNodeDto, UpdatePersonNodeDto, UpdateCanvasPositionDto, AddChildDto } from '@genyra/shared-types'

@Injectable()
export class PersonNodesService {
  constructor(
    private readonly prisma:        PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findById(id: string): Promise<PersonNode> {
    const node = await this.prisma.personNode.findUnique({
      where: { id },
      include: { user: { select: { nik: true } } },
    })
    if (!node) throw new NotFoundException('Person node not found')
    return this.toDto(node)
  }

  async createForUser(dto: CreatePersonNodeDto, userId: string): Promise<PersonNode> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { personNodes: { where: { familyGroupId: { not: null } }, take: 1 } },
    })
    const familyGroupId = user?.personNodes[0]?.familyGroupId
    if (!familyGroupId) {
      throw new ForbiddenException('User does not belong to a family group')
    }
    return this.create(dto, familyGroupId)
  }

  async create(dto: CreatePersonNodeDto, familyGroupId: string): Promise<PersonNode> {
    const node = await this.prisma.personNode.create({
      data: {
        displayName: dto.displayName,
        gender: dto.gender ?? null,
        surname: dto.surname ?? null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        birthPlace: dto.birthPlace ?? null,
        deathDate: dto.deathDate ? new Date(dto.deathDate) : null,
        bio: dto.bio ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        isDeceased: dto.isDeceased ?? false,
        isPlaceholder: dto.isPlaceholder ?? false,
        canvasX: dto.canvasX ?? 0,
        canvasY: dto.canvasY ?? 0,
        userId: dto.userId ?? null,
        familyGroupId,
      },
      include: { user: { select: { nik: true } } },
    })
    return this.toDto(node)
  }

  async update(
    id: string,
    dto: UpdatePersonNodeDto,
    requestingUserId: string,
  ): Promise<PersonNode> {
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node) throw new NotFoundException('Person node not found')

    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    const isSelf = node.userId === requestingUserId
    const isFamilyHead = user?.role === 'FAMILY_HEAD'

    if (!isSelf && !isFamilyHead) {
      throw new ForbiddenException('You can only edit your own profile')
    }

    const updateData: Prisma.PersonNodeUpdateInput = {
      ...(dto.displayName !== undefined && { displayName: dto.displayName }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.surname !== undefined && { surname: dto.surname }),
      ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
      ...(dto.birthPlace !== undefined && { birthPlace: dto.birthPlace }),
      ...(dto.deathDate !== undefined && { deathDate: dto.deathDate ? new Date(dto.deathDate) : null }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      ...(dto.isDeceased !== undefined && { isDeceased: dto.isDeceased }),
      ...(dto.isPlaceholder !== undefined && { isPlaceholder: dto.isPlaceholder }),
    }

    const updated = await this.prisma.personNode.update({
      where: { id },
      data: updateData,
      include: { user: { select: { nik: true } } },
    })

    // Notify family when a member is marked as deceased
    if (dto.isDeceased === true && !node.isDeceased && node.familyGroupId) {
      await this.prisma.notification.create({
        data: {
          familyGroupId: node.familyGroupId,
          type:          'MEMBER_DECEASED',
          message:       `${node.displayName} has passed away. May their memory be cherished.`,
          personNodeId:  node.id,
        },
      })
      await this.notifications.pruneForFamily(node.familyGroupId)
    }

    return this.toDto(updated)
  }

  async updateCanvasPosition(
    id: string,
    dto: UpdateCanvasPositionDto,
    requestingUserId: string,
  ): Promise<PersonNode> {
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node) throw new NotFoundException('Person node not found')

    // Verify requester is a member of the same family
    const isMember = node.familyGroupId
      ? await this.prisma.personNode.findFirst({
          where: { userId: requestingUserId, familyGroupId: node.familyGroupId },
        })
      : null
    if (!isMember) throw new ForbiddenException('Not a member of this family')

    const updated = await this.prisma.personNode.update({
      where: { id },
      data: { canvasX: dto.canvasX, canvasY: dto.canvasY },
      include: { user: { select: { nik: true } } },
    })
    return this.toDto(updated)
  }

  async delete(id: string, requestingUserId: string): Promise<void> {
    const headNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, role: 'FAMILY_HEAD', familyGroupId: { not: null } },
    })
    if (!headNode) throw new ForbiddenException('Only Family Head can delete person nodes')
    await this.prisma.personNode.delete({ where: { id } })
  }

  /** Nodes with no linked User account (created by old addChild or similar) — Family Head only. */
  async findUnlinked(requestingUserId: string): Promise<PersonNode[]> {
    const headNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, role: 'FAMILY_HEAD', familyGroupId: { not: null } },
      select: { familyGroupId: true },
    })
    const familyGroupId = headNode?.familyGroupId
    if (!familyGroupId) return []

    const nodes = await this.prisma.personNode.findMany({
      where: {
        familyGroupId,
        userId:          null,
        isPlaceholder:   false,
        pendingApproval: false,
      },
      include: { user: { select: { nik: true } } },
    })
    return nodes.map((n) => this.toDto(n))
  }

  async addChild(dto: AddChildDto, requestingUserId: string): Promise<PersonNode> {
    const user = await this.prisma.user.findUnique({
      where:   { id: requestingUserId },
      include: { personNodes: { where: { familyGroupId: { not: null } }, take: 1 } },
    })
    const activeNode = user?.personNodes[0]
    if (!activeNode?.familyGroupId) {
      throw new ForbiddenException('You must be in a family group to add a child')
    }

    // Check NIK uniqueness
    const existingNik = await this.prisma.user.findUnique({ where: { nik: dto.nik } })
    if (existingNik) throw new BadRequestException('This NIK is already registered')

    // Must have a spouse relationship
    const spouseEdge = await this.prisma.relationshipEdge.findFirst({
      where: {
        OR: [
          { sourceId: activeNode.id, relationshipType: 'SPOUSE' },
          { targetId: activeNode.id, relationshipType: 'SPOUSE' },
        ],
      },
    })
    if (!spouseEdge) {
      throw new BadRequestException('You must be married (have a spouse) to add a child')
    }

    const spouseId      = spouseEdge.sourceId === activeNode.id
      ? spouseEdge.targetId
      : spouseEdge.sourceId
    const isFamilyHead  = user!.role === 'FAMILY_HEAD'
    const familyGroupId = activeNode.familyGroupId
    // Child inherits parent's passwordHash so they can log in with the family password
    const passwordHash  = user!.passwordHash

    const child = await this.prisma.$transaction(async (tx) => {
      const childUser = await tx.user.create({
        data: {
          nik:          dto.nik,
          passwordHash,
          role:         'FAMILY_MEMBER',
          status:       isFamilyHead ? 'ACTIVE' : 'PENDING_APPROVAL',
        },
      })

      const childNode = await tx.personNode.create({
        data: {
          displayName:     dto.displayName,
          gender:          dto.gender ?? null,
          surname:         dto.surname,
          birthDate:       dto.birthDate ? new Date(dto.birthDate) : null,
          birthPlace:      dto.birthPlace ?? null,
          familyGroupId,
          pendingApproval: !isFamilyHead,
          userId:          childUser.id,
        },
        include: { user: { select: { nik: true } } },
      })

      await tx.relationshipEdge.createMany({
        data: [
          { sourceId: activeNode.id, targetId: childNode.id, relationshipType: 'PARENT_CHILD' },
          { sourceId: spouseId,      targetId: childNode.id, relationshipType: 'PARENT_CHILD' },
        ],
        skipDuplicates: true,
      })

      return childNode
    })

    return this.toDto(child)
  }

  async approve(id: string, requestingUserId: string): Promise<PersonNode> {
    const requestingUser = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    if (requestingUser?.role !== 'FAMILY_HEAD') {
      throw new ForbiddenException('Only Family Head can approve pending members')
    }

    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node) throw new NotFoundException('Person node not found')

    const updated = await this.prisma.personNode.update({
      where: { id },
      data:  { pendingApproval: false },
      include: { user: { select: { nik: true } } },
    })

    // Also activate the linked user if they are pending
    if (node.userId) {
      await this.prisma.user.update({
        where: { id: node.userId },
        data:  { status: 'ACTIVE' },
      })
    }

    return this.toDto(updated)
  }

  private toDto(node: {
    id: string
    displayName: string
    gender: 'MALE' | 'FEMALE' | null
    surname: string | null
    birthDate: Date | null
    birthPlace: string | null
    deathDate: Date | null
    bio: string | null
    avatarUrl: string | null
    isDeceased: boolean
    isPlaceholder: boolean
    pendingApproval: boolean
    canvasX: number
    canvasY: number
    userId: string | null
    familyGroupId: string | null
    createdAt: Date
    updatedAt: Date
    user?: { nik: string } | null
  }): PersonNode {
    return {
      id: node.id,
      displayName: node.displayName,
      gender: node.gender ?? null,
      surname: node.surname ?? null,
      nik: node.user?.nik ?? null,
      birthDate: node.birthDate?.toISOString() ?? null,
      birthPlace: node.birthPlace,
      deathDate: node.deathDate?.toISOString() ?? null,
      bio: node.bio,
      avatarUrl: sanitizeAvatarUrl(node.avatarUrl),
      isDeceased: node.isDeceased,
      isPlaceholder: node.isPlaceholder,
      pendingApproval: node.pendingApproval,
      canvasX: node.canvasX,
      canvasY: node.canvasY,
      userId: node.userId,
      familyGroupId: node.familyGroupId,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    }
  }
}
