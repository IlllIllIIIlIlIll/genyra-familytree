import { Controller, Post, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ShareService } from './share.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

@ApiTags('share')
@Controller('share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post('token')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a read-only share link (Family Head only)' })
  async createToken(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ token: string; expiresAt: string }> {
    return this.shareService.createToken(user.sub)
  }

  @Get(':token')
  @ApiOperation({ summary: 'Get public map data via share token (no auth required)' })
  async getPublicMap(
    @Param('token') token: string,
  ): Promise<{ familyName: string; nodes: object[]; edges: object[] }> {
    return this.shareService.getPublicMapData(token)
  }
}
