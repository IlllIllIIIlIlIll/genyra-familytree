import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import type { Notification } from '@genyra/shared-types'

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my-family')
  @ApiOperation({ summary: 'Get notifications for current user\'s family group' })
  async getForFamily(@CurrentUser() user: JwtPayload): Promise<Notification[]> {
    return this.notificationsService.getForFamily(user.sub)
  }
}
