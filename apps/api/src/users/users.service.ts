import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common'
import * as argon2 from 'argon2'
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
      include: { personNodes: { take: 1 } },
    })
    if (!user || !user.personNodes[0]) throw new NotFoundException('User not found')
    return this.toUserDto(user, user.personNodes[0])
  }

  async findActiveByGroup(requestingUserId: string): Promise<User[]> {
    const me = await this.prisma.user.findUnique({
      where:   { id: requestingUserId },
      include: { personNodes: { where: { familyGroupId: { not: null }, role: 'FAMILY_HEAD' }, select: { familyGroupId: true, role: true }, take: 1 } },
    })
    const familyGroupId = me?.personNodes[0]?.familyGroupId
    if (!familyGroupId) throw new ForbiddenException('Only Family Head can list members')
    if (me?.personNodes[0]?.role !== 'FAMILY_HEAD') throw new ForbiddenException('Only Family Head can list members')

    const users = await this.prisma.user.findMany({
      where: {
        status:      { not: 'PENDING_APPROVAL' },
        personNodes: { some: { familyGroupId } },
        NOT:         { id: requestingUserId },   // exclude self
      },
      include:  { personNodes: { where: { familyGroupId }, take: 1 } },
      orderBy:  { createdAt: 'asc' },
    })
    return users
      .filter((u) => u.personNodes[0])
      .map((u) => this.toUserDto(u, u.personNodes[0]!))
  }

  async deleteUser(targetId: string, requestingUserId: string, headPassword: string): Promise<void> {
    const [requesterNode, requester, target] = await Promise.all([
      this.prisma.personNode.findFirst({ where: { userId: requestingUserId, role: 'FAMILY_HEAD', familyGroupId: { not: null } } }),
      this.prisma.user.findUnique({ where: { id: requestingUserId } }),
      this.prisma.user.findUnique({ where: { id: targetId }, include: { personNodes: { take: 1 } } }),
    ])
    if (!requesterNode) throw new ForbiddenException('Only Family Head can remove members')
    if (!requester) throw new NotFoundException('Requester not found')
    if (!target) throw new NotFoundException('User not found')
    if (target.id === requestingUserId) throw new ForbiddenException('You cannot remove yourself')
    if (target.role === 'FAMILY_HEAD') throw new ForbiddenException('Cannot remove another Family Head')

    // M-10: Verify the head's own password (not the target's)
    const valid = await argon2.verify(requester.passwordHash, headPassword)
    if (!valid) throw new UnauthorizedException('Incorrect password')

    await this.prisma.$transaction(async (tx) => {
      // M-11: Soft-delete — convert to placeholder to preserve relationships
      if (target.personNodes[0]) {
        await tx.personNode.update({
          where: { id: target.personNodes[0].id },
          data: {
            isPlaceholder: true,
            userId: null,
            displayName: target.personNodes[0].displayName + ' (removed)',
          },
        })
      }
      await tx.user.delete({ where: { id: targetId } })
    })
  }

  async findPendingByGroup(familyGroupId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status:      'PENDING_APPROVAL',
        personNodes: { some: { familyGroupId } },
      },
      include: { personNodes: { where: { familyGroupId }, take: 1 } },
    })
    return users
      .filter((u) => u.personNodes[0])
      .map((u) => this.toUserDto(u, u.personNodes[0]!))
  }

  async updateStatus(userId: string, status: MemberStatus, familyGroupId: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where:   { id: userId },
      include: { personNodes: { where: { familyGroupId }, take: 1 } },
    })
    if (!existing || !existing.personNodes[0]) throw new NotFoundException('User not found')

    // Reject (DEACTIVATED) of a pending member → delete entirely so the NIK is freed
    if (status === 'DEACTIVATED' && existing.status === 'PENDING_APPROVAL') {
      const dto = this.toUserDto(existing, existing.personNodes[0])
      await this.prisma.$transaction(async (tx) => {
        await tx.personNode.delete({ where: { id: existing.personNodes[0]!.id } })
        await tx.user.delete({ where: { id: userId } })
      })
      return dto
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data:  {
        status,
        ...(status === 'ACTIVE' && {
          // C-05: Scope updateMany to this family only
          personNodes: { updateMany: { where: { familyGroupId }, data: { pendingApproval: false } } },
        }),
      },
      include: { personNodes: { where: { familyGroupId }, take: 1 } },
    })

    if (status === 'ACTIVE' && user.personNodes[0]) {
      const node          = user.personNodes[0]
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

    return this.toUserDto(user, user.personNodes[0]!)
  }

  async getPendingCount(requestingUserId: string): Promise<{ pendingCount: number; inviteExpired: boolean }> {
    const user = await this.prisma.user.findUnique({
      where:   { id: requestingUserId },
      include: { personNodes: { where: { familyGroupId: { not: null }, role: 'FAMILY_HEAD' }, select: { familyGroupId: true, role: true }, take: 1 } },
    })
    const familyGroupId = user?.personNodes[0]?.familyGroupId
    if (!familyGroupId || user?.personNodes[0]?.role !== 'FAMILY_HEAD') return { pendingCount: 0, inviteExpired: false }

    const [pendingUsers, pendingNodes, invite] = await Promise.all([
      this.prisma.user.count({ where: { status: 'PENDING_APPROVAL', personNodes: { some: { familyGroupId } } } }),
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
      include: { personNodes: { where: { familyGroupId: { not: null }, role: 'FAMILY_HEAD' }, select: { familyGroupId: true, role: true }, take: 1 } },
    })
    if (!user) return []
    const familyGroupId = user.personNodes[0]?.familyGroupId
    if (!familyGroupId || user.personNodes[0]?.role !== 'FAMILY_HEAD') return []

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

  async updateNik(targetUserId: string, newNik: string, requestingUserId: string): Promise<User> {
    const requesterNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, role: 'FAMILY_HEAD', familyGroupId: { not: null } },
    })
    if (!requesterNode) throw new ForbiddenException('Only Family Head can change NIK')
    if (targetUserId === requestingUserId) throw new ForbiddenException('Use the profile page to update your own NIK through the standard process')

    // Validate NIK format (16 digits)
    if (!/^\d{16}$/.test(newNik)) throw new BadRequestException('NIK must be exactly 16 digits')

    // Check uniqueness
    const existingNik = await this.prisma.user.findUnique({ where: { nik: newNik } })
    if (existingNik && existingNik.id !== targetUserId) throw new ConflictException('This NIK is already registered to another user')

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { nik: newNik },
      include: { personNodes: { take: 1 } },
    })
    return this.toUserDto(updated, updated.personNodes[0]!)
  }

  /** Translate referrerRelationship → a RelationshipEdge on approval. */
  private async createReferrerEdge(
    newNodeId:    string,
    referrerNik:  string,
    relationship: string,
  ): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where:   { nik: referrerNik },
      include: { personNodes: { include: { relationshipsAsSource: true, relationshipsAsTarget: true }, take: 1 } },
    })
    const referrerNode = referrer?.personNodes[0]
    if (!referrerNode) return

    const referrerNodeId = referrerNode.id
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
        referrerNode.relationshipsAsSource.find((e) => e.relationshipType === 'SPOUSE') ??
        referrerNode.relationshipsAsTarget.find((e) => e.relationshipType === 'SPOUSE')
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
