import { Controller, Get, Patch, Delete, Body, UseGuards, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import type { User, MemberStatus, PersonNode, AdminBadge } from '@genyra/shared-types'

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

  @Get('members')
  @UseGuards(RolesGuard)
  @Roles('FAMILY_HEAD')
  @ApiOperation({ summary: 'Get all active family members (Family Head only)' })
  async getMembers(@CurrentUser() user: JwtPayload): Promise<User[]> {
    return this.usersService.findActiveByGroup(user.sub)
  }

  @Get('pending-count')
  @ApiOperation({ summary: 'Get pending approvals count + invite status (Family Head only)' })
  async pendingCount(@CurrentUser() user: JwtPayload): Promise<AdminBadge> {
    return this.usersService.getPendingCount(user.sub)
  }

  @Get('pending-nodes')
  @ApiOperation({ summary: 'Get pending person nodes for the requesting user group (Family Head only)' })
  async pendingNodes(@CurrentUser() user: JwtPayload): Promise<PersonNode[]> {
    return this.usersService.findPendingNodesByGroup(user.sub)
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
    @CurrentUser() user: JwtPayload,
  ): Promise<User> {
    return this.usersService.updateStatus(id, body.status, user.fid)
  }

  @Patch(':id/nik')
  @UseGuards(RolesGuard)
  @Roles('FAMILY_HEAD')
  @ApiOperation({ summary: 'Update a member NIK (Family Head only)' })
  async updateNik(
    @Param('id') id: string,
    @Body() body: { nik: string },
    @CurrentUser() user: JwtPayload,
  ): Promise<User> {
    return this.usersService.updateNik(id, body.nik, user.sub)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('FAMILY_HEAD')
  @ApiOperation({ summary: 'Remove a family member (Family Head only, requires head\'s own password)' })
  async deleteUser(
    @Param('id') id: string,
    @Body() body: { headPassword: string },
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.usersService.deleteUser(id, user.sub, body.headPassword)
  }
}
