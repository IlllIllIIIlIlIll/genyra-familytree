import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PersonNodesService } from './person-nodes.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import { UpdatePersonNodeSchema, UpdateCanvasPositionSchema, AddChildSchema } from '@genyra/shared-types'
import type { PersonNode, UpdatePersonNodeDto, UpdateCanvasPositionDto, AddChildDto } from '@genyra/shared-types'

@ApiTags('person-nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('person-nodes')
export class PersonNodesController {
  constructor(private readonly personNodesService: PersonNodesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search person nodes by name within the current family' })
  async search(
    @Query('q') q: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode[]> {
    return this.personNodesService.search(q ?? '', user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a person node by ID' })
  async findOne(@Param('id') id: string): Promise<PersonNode> {
    return this.personNodesService.findById(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update your own person node' })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode> {
    const dto = UpdatePersonNodeSchema.parse(body) satisfies UpdatePersonNodeDto
    return this.personNodesService.update(id, dto, user)
  }

  @Patch(':id/canvas-position')
  @ApiOperation({ summary: 'Update canvas position (called on drag end)' })
  async updatePosition(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode> {
    const dto = UpdateCanvasPositionSchema.parse(body) satisfies UpdateCanvasPositionDto
    return this.personNodesService.updateCanvasPosition(id, dto, user)
  }

  @Post('add-child')
  @ApiOperation({ summary: 'Add a newborn child (requires an existing SPOUSE relationship)' })
  async addChild(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode> {
    const dto = AddChildSchema.parse(body) satisfies AddChildDto
    return this.personNodesService.addChild(dto, user)
  }
}
