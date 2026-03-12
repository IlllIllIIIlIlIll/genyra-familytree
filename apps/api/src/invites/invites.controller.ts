import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { InvitesService } from './invites.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import type { Invite } from '@genyra/shared-types'

@ApiTags('invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate an invite code (Family Head only)' })
  async generate(@CurrentUser() user: JwtPayload): Promise<Invite> {
    return this.invitesService.generate(user.sub)
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate an invite code (no auth required)' })
  async validate(
    @Body() body: { code: string },
  ): Promise<{ valid: boolean; familyGroupId?: string }> {
    return this.invitesService.validate(body.code)
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'List all invites for a family group (Family Head only)' })
  async listByGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Invite[]> {
    return this.invitesService.listByGroup(groupId, user.sub)
  }
}
