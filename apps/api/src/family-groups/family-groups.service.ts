import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type {
  FamilyGroup,
  MapData,
  CreateFamilyGroupDto,
  CreateFamilyWithParentsDto,
  PersonNode,
  RelationshipEdge,
} from '@genyra/shared-types'

/** Only pass through data URLs or absolute https URLs — drop stale local file paths. */
function sanitizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('https://')) return url
  return null
}

@Injectable()
export class FamilyGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateFamilyGroupDto, creatorId: string): Promise<FamilyGroup> {
    // A user can own at most 1 family
    const ownedFamilies = await this.prisma.personNode.count({
      where: { userId: creatorId, role: 'FAMILY_HEAD' },
    })
    if (ownedFamilies >= 1) throw new BadRequestException('You already own a family. A user can own at most 1 family.')

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
        personNodes: {
          updateMany: { where: {}, data: { familyGroupId: group.id } },
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
      include: { personNodes: { take: 1 } },
    })
    if (!creator || !creator.personNodes[0]) throw new NotFoundException('User not found')
    if (creator.personNodes[0].familyGroupId) throw new BadRequestException('User already has a family group')

    // A user can own at most 1 family
    const ownedFamilies = await this.prisma.personNode.count({
      where: { userId: creatorId, role: 'FAMILY_HEAD' },
    })
    if (ownedFamilies >= 1) throw new BadRequestException('You already own a family. A user can own at most 1 family.')

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
      where: { id: creator.personNodes[0].id },
      data: {
        familyGroupId: groupId,
        role: 'FAMILY_HEAD',
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
      include: { personNodes: { take: 1 } },
    })
    if (!user || !user.personNodes[0]) throw new NotFoundException('User not found')
    if (user.personNodes[0].familyGroupId) throw new BadRequestException('User is already in a family group')

    // Max 3 total families
    const totalFamilies = await this.prisma.personNode.count({
      where: { userId: requestingUserId, pendingApproval: false },
    })
    if (totalFamilies >= 3) throw new BadRequestException('You are already in 3 families. The maximum is 3.')

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: requestingUserId },
        data: {
          status: 'PENDING_APPROVAL',
          personNodes: {
            updateMany: {
              where: {},
              data: { familyGroupId: invite.familyGroupId },
            },
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

  async joinAdditional(
    inviteCode: string,
    requestingUserId: string,
  ): Promise<{ message: string }> {
    const invite = await this.prisma.invite.findUnique({ where: { code: inviteCode } })
    if (!invite || invite.status !== 'UNUSED' || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite code')
    }

    const targetFamilyId = invite.familyGroupId

    // Already in this family?
    const existing = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId: targetFamilyId },
    })
    if (existing) throw new ConflictException('You are already a member of this family')

    // Max 3 families
    const totalFamilies = await this.prisma.personNode.count({
      where: { userId: requestingUserId },
    })
    if (totalFamilies >= 3) throw new BadRequestException('You are already in 3 families. The maximum is 3.')

    // Cannot own more than 1 — just joining, role will be FAMILY_MEMBER

    // Get user's info to copy to new PersonNode
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { personNodes: { take: 1 } },
    })
    if (!user) throw new NotFoundException('User not found')
    const sourceNode = user.personNodes[0]

    await this.prisma.$transaction(async (tx) => {
      await tx.personNode.create({
        data: {
          userId: requestingUserId,
          familyGroupId: targetFamilyId,
          displayName: sourceNode?.displayName ?? user.nik,
          gender: sourceNode?.gender ?? null,
          surname: sourceNode?.surname ?? null,
          birthDate: sourceNode?.birthDate ?? null,
          birthPlace: sourceNode?.birthPlace ?? null,
          bio: sourceNode?.bio ?? null,
          avatarUrl: sourceNode?.avatarUrl ?? null,
          pendingApproval: true,
          role: 'FAMILY_MEMBER',
        },
      })
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: 'USED', usedAt: new Date() },
      })
    })

    return { message: 'Request sent. Awaiting Family Head approval.' }
  }

  async getMapData(groupId: string, requestingUserId: string): Promise<MapData> {
    const memberNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId: groupId },
    })
    if (!memberNode) {
      throw new ForbiddenException('Not a member of this family group')
    }

    const [group, personNodes, relationships] = await Promise.all([
      this.prisma.familyGroup.findUnique({ where: { id: groupId } }),
      this.prisma.personNode.findMany({
        where: { familyGroupId: groupId, pendingApproval: false },
        include: {
          photos: { orderBy: { sortOrder: 'asc' }, take: 1 },
          user:   { select: { nik: true } },
        },
      }),
      this.prisma.relationshipEdge.findMany({
        where: {
          source: { familyGroupId: groupId, pendingApproval: false },
          target: { pendingApproval: false },
        },
      }),
    ])

    const nodes: PersonNode[] = personNodes.map((n) => ({
      id: n.id,
      displayName: n.displayName,
      gender: n.gender ?? null,
      surname: n.surname ?? null,
      nik: n.user?.nik ?? null,
      birthDate: n.birthDate?.toISOString() ?? null,
      birthPlace: n.birthPlace ?? null,
      deathDate: n.deathDate?.toISOString() ?? null,
      bio: n.bio ?? null,
      avatarUrl: n.photos[0]?.url ?? sanitizeAvatarUrl(n.avatarUrl),
      isDeceased: n.isDeceased,
      isPlaceholder: n.isPlaceholder,
      pendingApproval: n.pendingApproval,
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

  async updateName(id: string, name: string, requestingUserId: string): Promise<FamilyGroup> {
    const memberNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId: id },
    })
    if (memberNode?.role !== 'FAMILY_HEAD') {
      throw new ForbiddenException('Only the Family Head can update the family name')
    }
    const trimmed = name.trim()
    if (!trimmed) throw new BadRequestException('Family name cannot be empty')
    const group = await this.prisma.familyGroup.update({
      where: { id },
      data:  { name: trimmed },
    })
    return this.toFamilyGroupDto(group)
  }

  // ── Transfer Ownership ────────────────────────────────────────────────────

  async transferOwnership(
    requestingUserId: string,
    familyGroupId: string,
    newHeadUserId: string,
  ): Promise<{ message: string }> {
    const currentHeadNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId },
    })
    if (currentHeadNode?.role !== 'FAMILY_HEAD') {
      throw new ForbiddenException('Only the Family Head can transfer ownership')
    }

    const newHeadNode = await this.prisma.personNode.findFirst({
      where: { userId: newHeadUserId, familyGroupId, pendingApproval: false },
    })
    if (!newHeadNode) throw new NotFoundException('New owner is not an active member of this family')
    if (newHeadNode.role === 'FAMILY_HEAD') throw new BadRequestException('That member is already the Family Head')

    // Check new head is not already a head of another family (max 1 owned)
    const alreadyOwns = await this.prisma.personNode.count({
      where: { userId: newHeadUserId, role: 'FAMILY_HEAD', familyGroupId: { not: familyGroupId } },
    })
    if (alreadyOwns >= 1) throw new BadRequestException('That member already owns a different family')

    await this.prisma.$transaction(async (tx) => {
      await tx.personNode.update({ where: { id: currentHeadNode.id }, data: { role: 'FAMILY_MEMBER' } })
      await tx.personNode.update({ where: { id: newHeadNode.id }, data: { role: 'FAMILY_HEAD' } })
      await tx.user.update({ where: { id: requestingUserId }, data: { role: 'FAMILY_MEMBER' } })
      await tx.user.update({ where: { id: newHeadUserId }, data: { role: 'FAMILY_HEAD' } })
    })

    await this.prisma.notification.create({
      data: {
        familyGroupId,
        type: 'OWNERSHIP_TRANSFER',
        message: `${currentHeadNode.displayName} has transferred Family Head ownership to ${newHeadNode.displayName}.`,
        personNodeId: newHeadNode.id,
      },
    })
    await this.notifications.pruneForFamily(familyGroupId)

    return { message: 'Ownership transferred successfully.' }
  }

  // ── Family Deletion ────────────────────────────────────────────────────────

  async deleteFamily(requestingUserId: string, familyGroupId: string): Promise<{ message: string }> {
    const personNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId },
    })
    if (personNode?.role !== 'FAMILY_HEAD') {
      throw new ForbiddenException('Only the Family Head can delete the family')
    }

    // Only allowed if no other members remain
    const memberCount = await this.prisma.personNode.count({
      where: {
        familyGroupId,
        userId: { not: null },
        NOT: { userId: requestingUserId },
      },
    })
    if (memberCount > 0) {
      throw new BadRequestException('Cannot delete a family while other members remain. Remove all members first.')
    }

    await this.prisma.$transaction(async (tx) => {
      // Cascade: delete relationships, nodes, invites, notifications, leave requests, then family
      await tx.relationshipEdge.deleteMany({ where: { source: { familyGroupId } } })
      await tx.personNode.deleteMany({ where: { familyGroupId } })
      await tx.invite.deleteMany({ where: { familyGroupId } })
      await tx.notification.deleteMany({ where: { familyGroupId } })
      await tx.leaveRequest.deleteMany({ where: { familyGroupId } })
      await tx.familyGroup.delete({ where: { id: familyGroupId } })
      await tx.user.update({ where: { id: requestingUserId }, data: { role: 'FAMILY_MEMBER' } })
    })

    return { message: 'Family deleted successfully.' }
  }

  // ── Leave Request Feature ──────────────────────────────────────────────────

  async requestLeave(userId: string, familyGroupId: string): Promise<{ message: string }> {
    const personNode = await this.prisma.personNode.findFirst({
      where: { userId, familyGroupId },
    })
    if (!personNode) throw new NotFoundException('You are not a member of this family')
    if (personNode.role === 'FAMILY_HEAD') {
      throw new ForbiddenException('Family heads cannot leave their own family. Transfer ownership first or delete the family.')
    }

    // Block leaving if user has children in this family
    const hasChildren = await this.prisma.relationshipEdge.findFirst({
      where: {
        relationshipType: 'PARENT_CHILD',
        source: { userId, familyGroupId },
      },
    })
    if (hasChildren) {
      throw new BadRequestException('Cannot leave a family while you have children registered in it')
    }

    // Check if already has a pending request
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { userId_familyGroupId: { userId, familyGroupId } },
    })
    if (existing?.status === 'PENDING') throw new ConflictException('A leave request is already pending')

    // M-09: set expiresAt to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.prisma.leaveRequest.upsert({
      where: { userId_familyGroupId: { userId, familyGroupId } },
      create: { userId, familyGroupId, status: 'PENDING', expiresAt },
      update: { status: 'PENDING', expiresAt, updatedAt: new Date() },
    })

    // Create notification for family head
    await this.prisma.notification.create({
      data: {
        familyGroupId,
        type: 'LEAVE_REQUEST',
        message: `${personNode.displayName} has requested to leave the family.`,
        personNodeId: personNode.id,
      },
    })
    await this.notifications.pruneForFamily(familyGroupId)

    return { message: 'Leave request submitted. Awaiting family head approval.' }
  }

  async getLeaveRequests(requestingUserId: string, familyGroupId: string): Promise<unknown[]> {
    const personNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId },
    })
    if (personNode?.role !== 'FAMILY_HEAD') throw new ForbiddenException('Only Family Head can view leave requests')

    const requests = await this.prisma.leaveRequest.findMany({
      where: { familyGroupId, status: 'PENDING' },
      include: {
        user: {
          include: { personNodes: { where: { familyGroupId } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      displayName: r.user.personNodes[0]?.displayName ?? 'Unknown',
      nik: r.user.nik,
      familyGroupId: r.familyGroupId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  async processLeaveRequest(
    requestId: string,
    approve: boolean,
    requestingUserId: string,
    familyGroupId: string,
  ): Promise<{ message: string }> {
    const headNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId },
    })
    if (headNode?.role !== 'FAMILY_HEAD') throw new ForbiddenException('Only Family Head can process leave requests')

    const leaveRequest = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } })
    if (!leaveRequest || leaveRequest.familyGroupId !== familyGroupId) throw new NotFoundException('Leave request not found')

    if (approve) {
      await this.prisma.$transaction(async (tx) => {
        await tx.leaveRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED' },
        })
        // Delete the personNode from this family (cascade deletes their relationships)
        const node = await tx.personNode.findFirst({
          where: { userId: leaveRequest.userId, familyGroupId },
        })
        if (node) await tx.personNode.delete({ where: { id: node.id } })
      })
      return { message: 'Member has been removed from the family.' }
    } else {
      await this.prisma.leaveRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      })
      return { message: 'Leave request rejected.' }
    }
  }

  // M-08: Cancel a pending leave request
  async cancelLeaveRequest(userId: string, familyGroupId: string): Promise<{ message: string }> {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { userId_familyGroupId: { userId, familyGroupId } },
    })
    if (!request || request.status !== 'PENDING') {
      throw new NotFoundException('No pending leave request found')
    }
    await this.prisma.leaveRequest.update({
      where: { id: request.id },
      data:  { status: 'REJECTED' },
    })
    return { message: 'Leave request cancelled.' }
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
