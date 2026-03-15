import { Controller, Get, Patch, Body, UseGuards, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import type { User, MemberStatus } from '@genyra/shared-types'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<User> {
    return this.usersService.findById(user.sub)
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('FAMILY_HEAD')
  @ApiOperation({ summary: 'Get users by family group and status' })
  async getByFamilyGroup(
    @Query('familyGroupId') familyGroupId: string,
    @Query('status') status?: string,
  ): Promise<User[]> {
    if (status === 'PENDING_APPROVAL') {
      return this.usersService.findPendingByGroup(familyGroupId)
    }
    return []
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('FAMILY_HEAD')
  @ApiOperation({ summary: 'Update user status (Family Head only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: MemberStatus },
  ): Promise<User> {
    return this.usersService.updateStatus(id, body.status)
  }
}
