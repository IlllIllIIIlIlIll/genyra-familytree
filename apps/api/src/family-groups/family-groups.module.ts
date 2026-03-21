import { Module } from '@nestjs/common'
import { FamilyGroupsController } from './family-groups.controller'
import { FamilyGroupsService } from './family-groups.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports:     [NotificationsModule],
  controllers: [FamilyGroupsController],
  providers:   [FamilyGroupsService],
  exports:     [FamilyGroupsService],
})
export class FamilyGroupsModule {}
