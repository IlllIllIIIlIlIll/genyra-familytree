import { Module } from '@nestjs/common'
import { PersonNodesController } from './person-nodes.controller'
import { PersonNodesService } from './person-nodes.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports:     [NotificationsModule],
  controllers: [PersonNodesController],
  providers:   [PersonNodesService],
})
export class PersonNodesModule {}
