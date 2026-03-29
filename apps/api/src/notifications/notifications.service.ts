import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Notification } from '@genyra/shared-types'

const MAX_NOTIFICATIONS = 5

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForFamily(requestingUserId: string): Promise<Notification[]> {
    const user = await this.prisma.user.findUnique({
      where:   { id: requestingUserId },
      include: { personNodes: { where: { familyGroupId: { not: null } }, select: { familyGroupId: true }, take: 1 } },
    })
    const familyGroupId = user?.personNodes[0]?.familyGroupId
    if (!familyGroupId) throw new ForbiddenException('Not a member of any family group')

    const rows = await this.prisma.notification.findMany({
      where:   { familyGroupId },
      orderBy: { createdAt: 'desc' },
      take:    MAX_NOTIFICATIONS,
    })

    return rows.map((n) => ({
      id:            n.id,
      familyGroupId: n.familyGroupId,
      type:          n.type,
      message:       n.message,
      personNodeId:  n.personNodeId ?? null,
      readAt:        n.readAt?.toISOString() ?? null,
      createdAt:     n.createdAt.toISOString(),
    }))
  }

  async markRead(id: string, requestingUserId: string): Promise<void> {
    const notif = await this.prisma.notification.findUnique({ where: { id } })
    if (!notif) return

    // Verify user belongs to this family
    const member = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId: notif.familyGroupId },
    })
    if (!member) throw new ForbiddenException('Not a member of this family')

    await this.prisma.notification.update({
      where: { id },
      data:  { readAt: new Date() },
    })
  }

  async dismiss(id: string, requestingUserId: string): Promise<void> {
    const notif = await this.prisma.notification.findUnique({ where: { id } })
    if (!notif) return

    const member = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, familyGroupId: notif.familyGroupId },
    })
    if (!member) throw new ForbiddenException('Not a member of this family')

    await this.prisma.notification.delete({ where: { id } })
  }

  /** Call after creating a new notification to prune old ones beyond the cap. */
  async pruneForFamily(familyGroupId: string): Promise<void> {
    const all = await this.prisma.notification.findMany({
      where:   { familyGroupId },
      orderBy: { createdAt: 'desc' },
      select:  { id: true },
    })
    if (all.length > MAX_NOTIFICATIONS) {
      const toDelete = all.slice(MAX_NOTIFICATIONS).map((n) => n.id)
      await this.prisma.notification.deleteMany({ where: { id: { in: toDelete } } })
    }
  }
}
