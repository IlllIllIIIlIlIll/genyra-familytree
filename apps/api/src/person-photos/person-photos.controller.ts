import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { z } from 'zod'
import { PersonPhotosService } from './person-photos.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import type { PersonPhoto } from '@genyra/shared-types'

const UploadPhotoSchema = z.object({
  personNodeId: z.string().min(1),
  dataUrl:      z.string().min(1),
  caption:      z.string().max(500).nullable().optional(),
  takenAt:      z.string().datetime().nullable().optional(),
})

@ApiTags('person-photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PersonPhotosController {
  constructor(private readonly photosService: PersonPhotosService) {}

  @Get('person-nodes/:id/photos')
  @ApiOperation({ summary: 'Get all photos for a person node' })
  async findAll(@Param('id') id: string): Promise<PersonPhoto[]> {
    return this.photosService.findByPersonNode(id)
  }

  @Post('person-photos')
  @ApiOperation({ summary: 'Upload a photo (base64 data URL stored in DB)' })
  async upload(
    @Body() body: unknown,
    @CurrentUser() _user: JwtPayload,
  ): Promise<PersonPhoto> {
    const result = UploadPhotoSchema.safeParse(body)
    if (!result.success) throw new BadRequestException(result.error.message)
    const { personNodeId, dataUrl, caption, takenAt } = result.data
    return this.photosService.create({
      personNodeId,
      url:     dataUrl,
      caption: caption ?? null,
      takenAt: takenAt ?? null,
    })
  }

  @Delete('person-photos/:id')
  @ApiOperation({ summary: 'Delete a photo' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.photosService.delete(id, user.sub)
  }
}
