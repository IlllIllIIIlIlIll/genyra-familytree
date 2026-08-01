import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { JwtPayload } from '../common/decorators/current-user.decorator'
import type { Notification } from '@genyra/shared-types'

const MAX_NOTIFICATIONS = 5

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForFamily(requester: JwtPayload): Promise<Notification[]> {
    const familyGroupId = await this.resolveFamilyGroupId(requester)
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

  async markRead(id: string, requester: JwtPayload): Promise<void> {
    const notif = await this.prisma.notification.findUnique({ where: { id } })
    if (!notif) return
    await this.assertCanAccess(notif.familyGroupId, requester)
    await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } })
  }

  async dismiss(id: string, requester: JwtPayload): Promise<void> {
    const notif = await this.prisma.notification.findUnique({ where: { id } })
    if (!notif) return
    await this.assertCanAccess(notif.familyGroupId, requester)
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

  private async resolveFamilyGroupId(requester: JwtPayload): Promise<string | null> {
    if (requester.isAdmin) {
      const group = await this.prisma.familyGroup.findUnique({ where: { adminAccountId: requester.sub } })
      return group?.id ?? null
    }
    return requester.fid ?? null
  }

  private async assertCanAccess(familyGroupId: string, requester: JwtPayload): Promise<void> {
    const resolved = await this.resolveFamilyGroupId(requester)
    if (resolved !== familyGroupId) throw new ForbiddenException('Not a member of this family')
  }
}
