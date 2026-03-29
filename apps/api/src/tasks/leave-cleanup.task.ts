import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class LeaveCleanupTask {
  private readonly logger = new Logger(LeaveCleanupTask.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleLeaveRequests(): Promise<void> {
    const result = await this.prisma.leaveRequest.updateMany({
      where: {
        status:    'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'REJECTED' },
    })
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} stale leave request(s)`)
    }
  }
}
