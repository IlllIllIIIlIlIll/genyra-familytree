import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common'
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

  @Get('my-family')
  @ApiOperation({ summary: 'Get (or create) the family invite code (Family Head only)' })
  async getOrCreate(@CurrentUser() user: JwtPayload): Promise<Invite> {
    return this.invitesService.getOrCreateForFamily(user.sub)
  }

  @Patch('my-family/refresh')
  @ApiOperation({ summary: 'Refresh the family invite code (Family Head only)' })
  async refresh(@CurrentUser() user: JwtPayload): Promise<Invite> {
    return this.invitesService.refreshForFamily(user.sub)
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate an invite code (no auth required)' })
  async validate(
    @Body() body: { code: string },
  ): Promise<{ valid: boolean; familyGroupId?: string }> {
    return this.invitesService.validate(body.code)
  }
}
