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
      include: { personNode: { select: { familyGroupId: true } } },
    })
    const familyGroupId = user?.personNode?.familyGroupId
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
      createdAt:     n.createdAt.toISOString(),
    }))
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
