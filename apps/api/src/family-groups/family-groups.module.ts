import { Module } from '@nestjs/common'
import { FamilyGroupsController } from './family-groups.controller'
import { FamilyGroupsService } from './family-groups.service'

@Module({
  controllers: [FamilyGroupsController],
  providers: [FamilyGroupsService],
  exports: [FamilyGroupsService],
})
export class FamilyGroupsModule {}
