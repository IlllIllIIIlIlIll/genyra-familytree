import { Controller, Get, Post, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { FamilyGroupsService } from './family-groups.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import type { FamilyGroup, MapData } from '@genyra/shared-types'

@ApiTags('family-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family-groups')
export class FamilyGroupsController {
  constructor(private readonly familyGroupsService: FamilyGroupsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get family group info' })
  async findOne(@Param('id') id: string): Promise<FamilyGroup> {
    return this.familyGroupsService.findById(id)
  }

  @Get(':id/map-data')
  @ApiOperation({ summary: 'Get all nodes and edges for the family map canvas' })
  async getMapData(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MapData> {
    return this.familyGroupsService.getMapData(id, user)
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to leave a family group' })
  async requestLeave(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.familyGroupsService.requestLeave(user, id)
  }

  @Delete(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel the caller's own pending leave request" })
  async cancelLeave(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.familyGroupsService.cancelLeaveRequest(user, id)
  }
}
