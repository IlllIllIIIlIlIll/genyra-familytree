import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { RelationshipsService } from './relationships.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import { CreateRelationshipSchema } from '@genyra/shared-types'
import type { RelationshipEdge, CreateRelationshipDto } from '@genyra/shared-types'

@ApiTags('relationships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('FAMILY_HEAD')
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a relationship between two person nodes' })
  async create(
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<RelationshipEdge> {
    const dto = CreateRelationshipSchema.parse(body) satisfies CreateRelationshipDto
    return this.relationshipsService.create(dto, user.sub)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a relationship' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.relationshipsService.delete(id, user.sub)
  }
}
