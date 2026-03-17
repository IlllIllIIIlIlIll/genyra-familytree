import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger'
import { PersonPhotosService } from './person-photos.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import type { PersonPhoto } from '@genyra/shared-types'
import type { FastifyRequest } from 'fastify'
import { createWriteStream, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'node:crypto'

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'photos')
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024

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
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a photo for a person node' })
  async upload(
    @Req() req: FastifyRequest,
    @CurrentUser() user: JwtPayload,
  ): Promise<PersonPhoto> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts = (req as any).parts() as AsyncIterable<any>
    const fields: Record<string, string> = {}
    let savedUrl: string | null = null

    mkdirSync(UPLOAD_DIR, { recursive: true })

    for await (const part of parts) {
      if (part.file) {
        if (!ALLOWED_MIME.has(part.mimetype as string)) {
          throw new BadRequestException('Only JPEG, PNG, WebP, or GIF images are allowed')
        }
        const ext = extname(part.filename as string) || '.jpg'
        const filename = `${randomUUID()}${ext}`
        const dest = join(UPLOAD_DIR, filename)
        let bytes = 0
        const ws = createWriteStream(dest)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const src = (part.file as any) as NodeJS.ReadableStream
        src.on('data', (chunk: Buffer) => {
          bytes += chunk.length
          if (bytes > MAX_BYTES) {
            ws.destroy()
            throw new BadRequestException('File too large (max 5 MB)')
          }
        })
        await pipeline(src, ws)
        savedUrl = `/uploads/photos/${filename}`
      } else {
        fields[part.fieldname as string] = part.value as string
      }
    }

    if (!savedUrl) throw new BadRequestException('No file uploaded')
    if (!fields['personNodeId']) throw new BadRequestException('personNodeId is required')

    return this.photosService.create({
      personNodeId: fields['personNodeId']!,
      url: savedUrl,
      caption: fields['caption'] ?? null,
      takenAt: fields['takenAt'] ?? null,
      sortOrder: fields['sortOrder'] ? Number(fields['sortOrder']) : 0,
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

// ── Avatar upload (separate endpoint on person-nodes) ─────────────────────────

export async function handleAvatarUpload(req: FastifyRequest): Promise<string> {
  const AVATAR_DIR = join(process.cwd(), 'uploads', 'avatars')
  mkdirSync(AVATAR_DIR, { recursive: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await (req as any).file()
  if (!data) throw new BadRequestException('No file uploaded')
  if (!ALLOWED_MIME.has(data.mimetype as string)) {
    throw new BadRequestException('Only JPEG, PNG, WebP, or GIF images are allowed')
  }

  const ext = extname(data.filename as string) || '.jpg'
  const filename = `${randomUUID()}${ext}`
  const dest = join(AVATAR_DIR, filename)
  await pipeline(data.file as NodeJS.ReadableStream, createWriteStream(dest))

  return `/uploads/avatars/${filename}`
}
