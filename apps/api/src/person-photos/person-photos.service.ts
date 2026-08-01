import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { JwtPayload } from '../common/decorators/current-user.decorator'
import type { PersonPhoto } from '@genyra/shared-types'

@Injectable()
export class PersonPhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPersonNode(personNodeId: string): Promise<PersonPhoto[]> {
    const photos = await this.prisma.personPhoto.findMany({
      where: { personNodeId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return photos.map(this.toDto)
  }

  async create(
    data: {
      personNodeId: string
      url: string
      caption?: string | null
      takenAt?: string | null
      sortOrder?: number
    },
    requester: JwtPayload,
  ): Promise<PersonPhoto> {
    const PHOTO_LIMIT = 20
    const count = await this.prisma.personPhoto.count({ where: { personNodeId: data.personNodeId } })
    if (count >= PHOTO_LIMIT) {
      throw new BadRequestException(`Photo limit reached (max ${PHOTO_LIMIT} per person)`)
    }

    const personNode = await this.prisma.personNode.findUnique({ where: { id: data.personNodeId } })
    if (!personNode) throw new NotFoundException('Person not found')

    // H-04: Validate MIME type and file size
    const VALID_MIME = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/
    const MAX_BYTES = 6_800_000 // ~5MB
    if (!VALID_MIME.test(data.url)) {
      throw new BadRequestException('Invalid image format. Allowed: JPEG, PNG, WebP, GIF.')
    }
    if (Buffer.byteLength(data.url, 'utf8') > MAX_BYTES) {
      throw new BadRequestException('Image too large. Maximum file size is 5MB.')
    }

    const isSelf  = !!requester.nik && personNode.nikId === requester.nik
    const isAdmin = requester.isAdmin && await this.ownsFamily(requester.sub, personNode.familyGroupId)
    if (!isSelf && !isAdmin) throw new ForbiddenException('You can only add photos to your own profile')

    const photo = await this.prisma.personPhoto.create({
      data: {
        personNodeId: data.personNodeId,
        url: data.url,
        caption: data.caption ?? null,
        takenAt: data.takenAt ? new Date(data.takenAt) : null,
        sortOrder: data.sortOrder ?? 0,
      },
    })
    return this.toDto(photo)
  }

  async delete(id: string, requester: JwtPayload): Promise<void> {
    const photo = await this.prisma.personPhoto.findUnique({
      where: { id },
      include: { personNode: { select: { nikId: true, familyGroupId: true } } },
    })
    if (!photo) throw new NotFoundException('Photo not found')

    const isSelf  = !!requester.nik && photo.personNode.nikId === requester.nik
    const isAdmin = requester.isAdmin && await this.ownsFamily(requester.sub, photo.personNode.familyGroupId)

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('You can only delete your own photos')
    }

    await this.prisma.personPhoto.delete({ where: { id } })
  }

  private async ownsFamily(accountId: string, familyGroupId: string | null): Promise<boolean> {
    if (!familyGroupId) return false
    const group = await this.prisma.familyGroup.findUnique({ where: { adminAccountId: accountId } })
    return group?.id === familyGroupId
  }

  private toDto(photo: {
    id: string
    url: string
    caption: string | null
    takenAt: Date | null
    sortOrder: number
    personNodeId: string
    createdAt: Date
  }): PersonPhoto {
    return {
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      takenAt: photo.takenAt?.toISOString() ?? null,
      sortOrder: photo.sortOrder,
      personNodeId: photo.personNodeId,
      createdAt: photo.createdAt.toISOString(),
    }
  }
}
