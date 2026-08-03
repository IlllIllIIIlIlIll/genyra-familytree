import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { FamilyGroupsModule } from './family-groups/family-groups.module'
import { PersonNodesModule } from './person-nodes/person-nodes.module'
import { AdminModule } from './admin/admin.module'
import { PersonPhotosModule } from './person-photos/person-photos.module'
import { NotificationsModule } from './notifications/notifications.module'
import { AuditModule } from './audit/audit.module'
import { TasksModule } from './tasks/tasks.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,    limit: 20 },
      { name: 'medium', ttl: 10000,   limit: 60 },
      { name: 'long',   ttl: 60000,   limit: 120 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamilyGroupsModule,
    PersonNodesModule,
    AdminModule,
    PersonPhotosModule,
    NotificationsModule,
    AuditModule,
    TasksModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
