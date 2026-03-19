import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { User, MemberStatus, PersonNode } from '@genyra/shared-types'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma:         PrismaService,
    private readonly notifications:  NotificationsService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { personNode: true },
    })
    if (!user || !user.personNode) throw new NotFoundException('User not found')
    return this.toUserDto(user, user.personNode)
  }

  async findActiveByGroup(requestingUserId: string): Promise<User[]> {
    const me = await this.prisma.user.findUnique({
      where:   { id: requestingUserId },
      include: { personNode: { select: { familyGroupId: true } } },
    })
    if (me?.role !== 'FAMILY_HEAD') throw new ForbiddenException('Only Family Head can list members')
    const familyGroupId = me.personNode?.familyGroupId
    if (!familyGroupId) return []

    const users = await this.prisma.user.findMany({
      where: {
        status:     { not: 'PENDING_APPROVAL' },
        personNode: { familyGroupId },
        NOT:        { id: requestingUserId },   // exclude self
      },
      include:  { personNode: true },
      orderBy:  { createdAt: 'asc' },
    })
    return users.map((u) => this.toUserDto(u, u.personNode!))
  }

  async deleteUser(targetId: string, requestingUserId: string): Promise<void> {
    const [requester, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: requestingUserId } }),
      this.prisma.user.findUnique({ where: { id: targetId }, include: { personNode: true } }),
    ])
    if (requester?.role !== 'FAMILY_HEAD') throw new ForbiddenException('Only Family Head can remove members')
    if (!target) throw new NotFoundException('User not found')
    if (target.id === requestingUserId) throw new ForbiddenException('You cannot remove yourself')
    if (target.role === 'FAMILY_HEAD') throw new ForbiddenException('Cannot remove another Family Head')

    await this.prisma.$transaction(async (tx) => {
      if (target.personNode) {
        await tx.personNode.delete({ where: { id: target.personNode.id } })
      }
      await tx.user.delete({ where: { id: targetId } })
    })
  }

  async findPendingByGroup(familyGroupId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        personNode: { familyGroupId },
      },
      include: { personNode: true },
    })
    return users.map((u) => this.toUserDto(u, u.personNode!))
  }

  async updateStatus(userId: string, status: MemberStatus): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where:   { id: userId },
      include: { personNode: true },
    })
    if (!existing || !existing.personNode) throw new NotFoundException('User not found')

    // Reject (DEACTIVATED) of a pending member → delete entirely so the NIK is freed
    if (status === 'DEACTIVATED' && existing.status === 'PENDING_APPROVAL') {
      const dto = this.toUserDto(existing, existing.personNode)
      await this.prisma.$transaction(async (tx) => {
        await tx.personNode.delete({ where: { id: existing.personNode!.id } })
        await tx.user.delete({ where: { id: userId } })
      })
      return dto
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data:  {
        status,
        ...(status === 'ACTIVE' && {
          personNode: { update: { pendingApproval: false } },
        }),
      },
      include: { personNode: true },
    })

    if (status === 'ACTIVE' && user.personNode) {
      const node          = user.personNode
      const familyGroupId = node.familyGroupId

      // Create relationship edge from referrer info
      if (user.referrerNik && user.referrerRelationship) {
        await this.createReferrerEdge(node.id, user.referrerNik, user.referrerRelationship)
      }

      // Notify family
      if (familyGroupId) {
        await this.prisma.notification.create({
          data: {
            familyGroupId,
            type:         'NEW_MEMBER',
            message:      `${node.displayName} has joined the family.`,
            personNodeId: node.id,
          },
        })
        await this.notifications.pruneForFamily(familyGroupId)
      }
    }

    return this.toUserDto(user, user.personNode!)
  }

  async getPendingCount(requestingUserId: string): Promise<{ pendingCount: number; inviteExpired: boolean }> {
    const user = await this.prisma.user.findUnique({
      where:   { id: requestingUserId },
      include: { personNode: { select: { familyGroupId: true } } },
    })
    if (user?.role !== 'FAMILY_HEAD') return { pendingCount: 0, inviteExpired: false }
    const familyGroupId = user.personNode?.familyGroupId
    if (!familyGroupId) return { pendingCount: 0, inviteExpired: false }

    const [pendingUsers, pendingNodes, invite] = await Promise.all([
      this.prisma.user.count({ where: { status: 'PENDING_APPROVAL', personNode: { familyGroupId } } }),
      this.prisma.personNode.count({
        where: { familyGroupId, pendingApproval: true, user: { status: { not: 'PENDING_APPROVAL' } } },
      }),
      this.prisma.invite.findFirst({ where: { familyGroupId }, orderBy: { createdAt: 'desc' } }),
    ])

    const inviteExpired = !invite || invite.status !== 'UNUSED' || invite.expiresAt < new Date()
    return { pendingCount: pendingUsers + pendingNodes, inviteExpired }
  }

  async findPendingNodesByGroup(requestingUserId: string): Promise<PersonNode[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { personNode: { select: { familyGroupId: true } } },
    })
    if (!user || user.role !== 'FAMILY_HEAD') return []
    const familyGroupId = user.personNode?.familyGroupId
    if (!familyGroupId) return []

    // Exclude nodes whose linked user is already PENDING_APPROVAL (already shown in member list)
    const nodes = await this.prisma.personNode.findMany({
      where: {
        familyGroupId,
        pendingApproval: true,
        user: { status: { not: 'PENDING_APPROVAL' } },
      },
      include: { user: { select: { nik: true } } },
    })
    return nodes.map((n) => ({
      id:              n.id,
      displayName:     n.displayName,
      gender:          n.gender ?? null,
      surname:         n.surname ?? null,
      nik:             n.user?.nik ?? null,
      birthDate:       n.birthDate?.toISOString() ?? null,
      birthPlace:      n.birthPlace ?? null,
      deathDate:       n.deathDate?.toISOString() ?? null,
      bio:             n.bio ?? null,
      avatarUrl:       n.avatarUrl ?? null,
      isDeceased:      n.isDeceased,
      isPlaceholder:   n.isPlaceholder,
      pendingApproval: n.pendingApproval,
      canvasX:         n.canvasX,
      canvasY:         n.canvasY,
      userId:          n.userId ?? null,
      familyGroupId:   n.familyGroupId,
      createdAt:       n.createdAt.toISOString(),
      updatedAt:       n.updatedAt.toISOString(),
    }))
  }

  /** Translate referrerRelationship → a RelationshipEdge on approval. */
  private async createReferrerEdge(
    newNodeId:    string,
    referrerNik:  string,
    relationship: string,
  ): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where:   { nik: referrerNik },
      include: { personNode: { include: { relationshipsAsSource: true, relationshipsAsTarget: true } } },
    })
    if (!referrer?.personNode) return

    const referrerNodeId = referrer.personNode.id
    let sourceId: string, targetId: string, type: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING'

    switch (relationship) {
      case 'REFERRER_IS_FATHER':
        // Referrer is the father → referrerNode --PARENT_CHILD--> newNode
        sourceId = referrerNodeId; targetId = newNodeId; type = 'PARENT_CHILD'
        break
      case 'REFERRER_IS_SON':
      case 'REFERRER_IS_DAUGHTER':
        // Referrer is a child → newNode --PARENT_CHILD--> referrerNode
        sourceId = newNodeId; targetId = referrerNodeId; type = 'PARENT_CHILD'
        break
      case 'REFERRER_IS_SPOUSE':
        sourceId = referrerNodeId; targetId = newNodeId; type = 'SPOUSE'
        break
      case 'REFERRER_IS_SIBLING':
        sourceId = referrerNodeId; targetId = newNodeId; type = 'SIBLING'
        break
      default:
        return
    }

    await this.prisma.relationshipEdge.upsert({
      where:  { sourceId_targetId_relationshipType: { sourceId, targetId, relationshipType: type } },
      create: { sourceId, targetId, relationshipType: type },
      update: {},
    })

    // For REFERRER_IS_FATHER also link the referrer's spouse as second parent
    if (relationship === 'REFERRER_IS_FATHER') {
      const spouseEdge =
        referrer.personNode.relationshipsAsSource.find((e) => e.relationshipType === 'SPOUSE') ??
        referrer.personNode.relationshipsAsTarget.find((e) => e.relationshipType === 'SPOUSE')
      if (spouseEdge) {
        const spouseNodeId = spouseEdge.sourceId === referrerNodeId ? spouseEdge.targetId : spouseEdge.sourceId
        await this.prisma.relationshipEdge.upsert({
          where:  { sourceId_targetId_relationshipType: { sourceId: spouseNodeId, targetId: newNodeId, relationshipType: 'PARENT_CHILD' } },
          create: { sourceId: spouseNodeId, targetId: newNodeId, relationshipType: 'PARENT_CHILD' },
          update: {},
        })
      }
    }
  }

  private toUserDto(
    user: {
      id: string
      nik: string
      role: string
      status: string
      createdAt: Date
      referrerNik?:          string | null
      referrerRelationship?: string | null
    },
    node: {
      displayName: string
      gender: 'MALE' | 'FEMALE' | null
      surname: string | null
      birthDate: Date | null
      birthPlace: string | null
      familyGroupId: string | null
    },
  ): User {
    return {
      id: user.id,
      nik: user.nik,
      displayName: node.displayName,
      gender: (node.gender as User['gender']) ?? 'MALE',
      surname: node.surname ?? '',
      birthDate: node.birthDate?.toISOString() ?? '',
      birthPlace: node.birthPlace ?? '',
      role: user.role as User['role'],
      status: user.status as User['status'],
      familyGroupId: node.familyGroupId,
      createdAt: user.createdAt.toISOString(),
      referrerNik:          user.referrerNik          ?? null,
      referrerRelationship: user.referrerRelationship ?? null,
    }
  }
}
