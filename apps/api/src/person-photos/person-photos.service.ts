import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
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
    requestingUserId: string,
  ): Promise<PersonPhoto> {
    const PHOTO_LIMIT = 20
    const count = await this.prisma.personPhoto.count({ where: { personNodeId: data.personNodeId } })
    if (count >= PHOTO_LIMIT) {
      throw new BadRequestException(`Photo limit reached (max ${PHOTO_LIMIT} per person)`)
    }

    const personNode = await this.prisma.personNode.findUnique({ where: { id: data.personNodeId } })
    if (!personNode) throw new NotFoundException('Person not found')

    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    const isSelf = personNode.userId === requestingUserId
    const isFamilyHead = user?.role === 'FAMILY_HEAD'
    if (!isSelf && !isFamilyHead) throw new ForbiddenException('You can only add photos to your own profile')

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

  async delete(id: string, requestingUserId: string): Promise<void> {
    const photo = await this.prisma.personPhoto.findUnique({
      where: { id },
      include: { personNode: true },
    })
    if (!photo) throw new NotFoundException('Photo not found')

    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    const isSelf = photo.personNode.userId === requestingUserId
    const isFamilyHead = user?.role === 'FAMILY_HEAD'

    if (!isSelf && !isFamilyHead) {
      throw new ForbiddenException('You can only delete your own photos')
    }

    await this.prisma.personPhoto.delete({ where: { id } })
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
