import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AdminService, type AdminMember } from './admin.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import {
  CreateAdminFamilyGroupSchema,
  CreateNikIdentitySchema,
  LinkAccountSchema,
  CreatePersonNodeSchema,
  UpdatePersonNodeSchema,
  CreateRelationshipSchema,
} from '@genyra/shared-types'
import type {
  FamilyGroup,
  PersonNode,
  RelationshipEdge,
  CreateAdminFamilyGroupDto,
  CreateNikIdentityDto,
  LinkAccountDto,
  CreatePersonNodeDto,
  UpdatePersonNodeDto,
  CreateRelationshipDto,
} from '@genyra/shared-types'

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('family')
  @ApiOperation({ summary: 'Get the family this admin owns' })
  async getMyFamily(@CurrentUser() user: JwtPayload): Promise<FamilyGroup> {
    return this.adminService.getMyFamily(user.sub)
  }

  @Post('family')
  @ApiOperation({ summary: 'Create the family this admin owns (one per admin)' })
  async createFamily(@Body() body: unknown, @CurrentUser() user: JwtPayload): Promise<FamilyGroup> {
    const dto = CreateAdminFamilyGroupSchema.parse(body) satisfies CreateAdminFamilyGroupDto
    return this.adminService.createFamily(user.sub, dto)
  }

  @Patch('family')
  @ApiOperation({ summary: 'Rename the family' })
  async updateFamily(@Body() body: { name: string }, @CurrentUser() user: JwtPayload): Promise<FamilyGroup> {
    return this.adminService.updateFamily(user.sub, body.name)
  }

  @Delete('family')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete the family and everything in it' })
  async deleteFamily(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    return this.adminService.deleteFamily(user.sub)
  }

  @Get('members')
  @ApiOperation({ summary: 'List all members (PersonNode + NIK + linked accounts) in the family' })
  async listMembers(@CurrentUser() user: JwtPayload): Promise<AdminMember[]> {
    return this.adminService.listMembers(user.sub)
  }

  @Post('nik-identities')
  @ApiOperation({ summary: 'Create a NIK identity + PersonNode in the family' })
  async createNikIdentity(@Body() body: unknown, @CurrentUser() user: JwtPayload): Promise<PersonNode> {
    const dto = CreateNikIdentitySchema.parse(body) satisfies CreateNikIdentityDto
    return this.adminService.createNikIdentity(user.sub, dto)
  }

  @Patch('nik-identities/:nik/status')
  @ApiOperation({ summary: "Activate/deactivate a NIK's access" })
  async setNikStatus(
    @Param('nik') nik: string,
    @Body() body: { status: 'ACTIVE' | 'DEACTIVATED' },
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.adminService.setNikStatus(user.sub, nik, body.status)
    return { message: 'Status updated.' }
  }

  @Post('nik-identities/:nik/link-account')
  @ApiOperation({ summary: 'Link (or pre-provision) a Google account email to a NIK (max 5 NIKs/account, 2 accounts/NIK)' })
  async linkAccount(
    @Param('nik') nik: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    const dto = LinkAccountSchema.parse(body) satisfies LinkAccountDto
    await this.adminService.linkAccount(user.sub, nik, dto.email)
    return { message: 'Account linked.' }
  }

  @Delete('nik-identities/:nik/link-account/:accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlink a Google account from a NIK' })
  async unlinkAccount(
    @Param('nik') nik: string,
    @Param('accountId') accountId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.adminService.unlinkAccount(user.sub, nik, accountId)
    return { message: 'Account unlinked.' }
  }

  @Post('person-nodes')
  @ApiOperation({ summary: 'Create a person node (placeholder or NIK-linked) in the family' })
  async createPersonNode(@Body() body: unknown, @CurrentUser() user: JwtPayload): Promise<PersonNode> {
    const dto = CreatePersonNodeSchema.parse(body) satisfies CreatePersonNodeDto
    return this.adminService.createPersonNode(user.sub, dto)
  }

  @Patch('person-nodes/:id')
  @ApiOperation({ summary: 'Update a person node in the family' })
  async updatePersonNode(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonNode> {
    const dto = UpdatePersonNodeSchema.parse(body) satisfies UpdatePersonNodeDto
    return this.adminService.updatePersonNode(user.sub, id, dto)
  }

  @Delete('person-nodes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a person node from the family' })
  async deletePersonNode(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.adminService.deletePersonNode(user.sub, id)
  }

  @Post('relationships')
  @ApiOperation({ summary: 'Create a relationship between two person nodes' })
  async createRelationship(@Body() body: unknown, @CurrentUser() user: JwtPayload): Promise<RelationshipEdge> {
    const dto = CreateRelationshipSchema.parse(body) satisfies CreateRelationshipDto
    return this.adminService.createRelationship(user.sub, dto)
  }

  @Delete('relationships/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a relationship' })
  async deleteRelationship(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.adminService.deleteRelationship(user.sub, id)
  }

  @Get('leave-requests')
  @ApiOperation({ summary: 'List pending leave requests' })
  async getLeaveRequests(@CurrentUser() user: JwtPayload): Promise<unknown[]> {
    return this.adminService.getLeaveRequests(user.sub)
  }

  @Patch('leave-requests/:requestId')
  @ApiOperation({ summary: 'Approve or reject a leave request' })
  async processLeaveRequest(
    @Param('requestId') requestId: string,
    @Body() body: { approve: boolean },
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.adminService.processLeaveRequest(user.sub, requestId, body.approve)
  }
}
