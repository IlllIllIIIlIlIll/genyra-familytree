import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { FamilyGroupsService } from './family-groups.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import { CreateFamilyGroupSchema, CreateFamilyWithParentsSchema } from '@genyra/shared-types'
import type {
  FamilyGroup,
  MapData,
  CreateFamilyGroupDto,
  CreateFamilyWithParentsDto,
} from '@genyra/shared-types'

@ApiTags('family-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family-groups')
export class FamilyGroupsController {
  constructor(private readonly familyGroupsService: FamilyGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new family group (caller becomes Family Head)' })
  async create(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<FamilyGroup> {
    const dto = CreateFamilyGroupSchema.parse(body) satisfies CreateFamilyGroupDto
    return this.familyGroupsService.create(dto, user.sub)
  }

  @Post('create-family')
  @ApiOperation({ summary: 'Create family with parents — called after first login, makes caller a Family Head' })
  async createWithParents(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<FamilyGroup> {
    const dto = CreateFamilyWithParentsSchema.parse(body) satisfies CreateFamilyWithParentsDto
    return this.familyGroupsService.createWithParents(dto, user.sub)
  }

  @Post('join')
  @ApiOperation({ summary: 'Join an existing family group via invite code' })
  async join(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    const { JoinGroupSchema } = await import('@genyra/shared-types')
    const dto = JoinGroupSchema.parse(body)
    return this.familyGroupsService.join(dto, user.sub)
  }

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
    return this.familyGroupsService.getMapData(id, user.sub)
  }
}
