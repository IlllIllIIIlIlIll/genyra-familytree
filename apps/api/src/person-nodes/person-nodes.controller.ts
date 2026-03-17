import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PersonNodesService } from './person-nodes.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import { CreatePersonNodeSchema, UpdatePersonNodeSchema, UpdateCanvasPositionSchema, AddChildSchema } from '@genyra/shared-types'
import type { PersonNode, CreatePersonNodeDto, UpdatePersonNodeDto, UpdateCanvasPositionDto, AddChildDto } from '@genyra/shared-types'

@ApiTags('person-nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('person-nodes')
export class PersonNodesController {
  constructor(private readonly personNodesService: PersonNodesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a person node by ID' })
  async findOne(@Param('id') id: string): Promise<PersonNode> {
    return this.personNodesService.findById(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new person node (placeholder or linked user)' })
  async create(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode> {
    const dto = CreatePersonNodeSchema.parse(body) satisfies CreatePersonNodeDto
    return this.personNodesService.createForUser(dto, user.sub)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a person node' })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode> {
    const dto = UpdatePersonNodeSchema.parse(body) satisfies UpdatePersonNodeDto
    return this.personNodesService.update(id, dto, user.sub)
  }

  @Patch(':id/canvas-position')
  @ApiOperation({ summary: 'Update canvas position (called on drag end)' })
  async updatePosition(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<PersonNode> {
    const dto = UpdateCanvasPositionSchema.parse(body) satisfies UpdateCanvasPositionDto
    return this.personNodesService.updateCanvasPosition(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a person node (Family Head only)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.personNodesService.delete(id, user.sub)
  }

  @Post('add-child')
  @ApiOperation({ summary: 'Father adds a newborn child (requires SPOUSE relationship)' })
  async addChild(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode> {
    const dto = AddChildSchema.parse(body) satisfies AddChildDto
    return this.personNodesService.addChild(dto, user.sub)
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a pending person node (Family Head only)' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode> {
    return this.personNodesService.approve(id, user.sub)
  }
}
