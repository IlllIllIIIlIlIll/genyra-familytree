import { Module } from '@nestjs/common'
import { LeaveCleanupTask } from './leave-cleanup.task'

@Module({
  providers: [LeaveCleanupTask],
})
export class TasksModule {}
