import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export interface RawAuditLogEntry {
  id: string
  familyGroupId: string
  actorAccountId: string
  action: string
  targetId: string | null
  details: string | null
  createdAt: Date
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    familyGroupId: string
    actorAccountId: string
    action: string
    targetId?: string
    details?: string
  }): Promise<void> {
    await this.prisma.auditLog.create({ data: params })
  }

  async getForFamily(familyGroupId: string, limit = 100): Promise<RawAuditLogEntry[]> {
    return this.prisma.auditLog.findMany({
      where:   { familyGroupId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    })
  }
}
