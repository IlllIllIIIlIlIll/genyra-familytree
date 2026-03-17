import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { User, MemberStatus, PersonNode } from '@genyra/shared-types'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { personNode: true },
    })
    if (!user || !user.personNode) throw new NotFoundException('User not found')
    return this.toUserDto(user, user.personNode)
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
    return this.toUserDto(user, user.personNode!)
  }

  async findPendingNodesByGroup(requestingUserId: string): Promise<PersonNode[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { personNode: { select: { familyGroupId: true } } },
    })
    if (!user || user.role !== 'FAMILY_HEAD') return []
    const familyGroupId = user.personNode?.familyGroupId
    if (!familyGroupId) return []

    const nodes = await this.prisma.personNode.findMany({
      where: {
        familyGroupId,
        pendingApproval: true,
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

  private toUserDto(
    user: {
      id: string
      nik: string
      role: string
      status: string
      createdAt: Date
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
    }
  }
}
