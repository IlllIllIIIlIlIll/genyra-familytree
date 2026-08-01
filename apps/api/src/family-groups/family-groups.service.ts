import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { JwtPayload } from '../common/decorators/current-user.decorator'
import type { FamilyGroup, MapData, PersonNode, RelationshipEdge } from '@genyra/shared-types'

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

  async findById(id: string): Promise<FamilyGroup> {
    const group = await this.prisma.familyGroup.findUnique({ where: { id } })
    if (!group) throw new NotFoundException('Family group not found')
    return this.toFamilyGroupDto(group)
  }

  async getMapData(groupId: string, requester: JwtPayload): Promise<MapData> {
    await this.assertCanView(groupId, requester)

    const [group, personNodes, relationships] = await Promise.all([
      this.prisma.familyGroup.findUnique({ where: { id: groupId } }),
      this.prisma.personNode.findMany({ where: { familyGroupId: groupId } }),
      this.prisma.relationshipEdge.findMany({
        where: { source: { familyGroupId: groupId } },
      }),
    ])

    const nodes: PersonNode[] = personNodes.map((n) => ({
      id: n.id,
      displayName: n.displayName,
      gender: n.gender ?? null,
      surname: n.surname ?? null,
      nik: n.nikId ?? null,
      birthDate: n.birthDate?.toISOString() ?? null,
      birthPlace: n.birthPlace ?? null,
      deathDate: n.deathDate?.toISOString() ?? null,
      bio: n.bio ?? null,
      avatarUrl: sanitizeAvatarUrl(n.avatarUrl),
      isDeceased: n.isDeceased,
      isPlaceholder: n.isPlaceholder,
      canvasX: n.canvasX,
      canvasY: n.canvasY,
      nikId: n.nikId ?? null,
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

  // ── Leave Request (self-service) ────────────────────────────────────────

  async requestLeave(requester: JwtPayload, familyGroupId: string): Promise<{ message: string }> {
    if (!requester.nik) throw new ForbiddenException('Not a personal account session')
    const personNode = await this.prisma.personNode.findFirst({
      where: { nikId: requester.nik, familyGroupId },
    })
    if (!personNode) throw new NotFoundException('You are not a member of this family')

    const hasChildren = await this.prisma.relationshipEdge.findFirst({
      where: { relationshipType: 'PARENT_CHILD', source: { nikId: requester.nik, familyGroupId } },
    })
    if (hasChildren) {
      throw new BadRequestException('Cannot leave a family while you have children registered in it')
    }

    const existing = await this.prisma.leaveRequest.findUnique({
      where: { nikId_familyGroupId: { nikId: requester.nik, familyGroupId } },
    })
    if (existing?.status === 'PENDING') throw new ConflictException('A leave request is already pending')

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.prisma.leaveRequest.upsert({
      where: { nikId_familyGroupId: { nikId: requester.nik, familyGroupId } },
      create: { nikId: requester.nik, familyGroupId, status: 'PENDING', expiresAt },
      update: { status: 'PENDING', expiresAt, updatedAt: new Date() },
    })

    await this.prisma.notification.create({
      data: {
        familyGroupId,
        type: 'LEAVE_REQUEST',
        message: `${personNode.displayName} has requested to leave the family.`,
        personNodeId: personNode.id,
      },
    })
    await this.notifications.pruneForFamily(familyGroupId)

    return { message: 'Leave request submitted. Awaiting admin approval.' }
  }

  async cancelLeaveRequest(requester: JwtPayload, familyGroupId: string): Promise<{ message: string }> {
    if (!requester.nik) throw new ForbiddenException('Not a personal account session')
    const request = await this.prisma.leaveRequest.findUnique({
      where: { nikId_familyGroupId: { nikId: requester.nik, familyGroupId } },
    })
    if (!request || request.status !== 'PENDING') {
      throw new NotFoundException('No pending leave request found')
    }
    await this.prisma.leaveRequest.update({ where: { id: request.id }, data: { status: 'REJECTED' } })
    return { message: 'Leave request cancelled.' }
  }

  private async assertCanView(groupId: string, requester: JwtPayload): Promise<void> {
    if (requester.isAdmin) {
      const group = await this.prisma.familyGroup.findUnique({ where: { id: groupId } })
      if (group?.adminAccountId !== requester.sub) throw new ForbiddenException('Not the admin of this family group')
      return
    }
    if (!requester.nik) throw new ForbiddenException('Not a member of this family group')
    const memberNode = await this.prisma.personNode.findFirst({
      where: { nikId: requester.nik, familyGroupId: groupId },
    })
    if (!memberNode) throw new ForbiddenException('Not a member of this family group')
  }

  private toFamilyGroupDto(group: {
    id: string
    name: string
    description: string | null
    adminAccountId: string
    createdAt: Date
  }): FamilyGroup {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      adminAccountId: group.adminAccountId,
      createdAt: group.createdAt.toISOString(),
    }
  }
}
