import { Module } from '@nestjs/common'
import { PersonNodesController } from './person-nodes.controller'
import { PersonNodesService } from './person-nodes.service'

@Module({
  controllers: [PersonNodesController],
  providers: [PersonNodesService],
})
export class PersonNodesModule {}
