import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    familyGroupId: string
    actorUserId: string
    action: string
    targetId?: string
    details?: string
  }): Promise<void> {
    await this.prisma.auditLog.create({ data: params })
  }

  async getForFamily(familyGroupId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where:   { familyGroupId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    })
  }
}
