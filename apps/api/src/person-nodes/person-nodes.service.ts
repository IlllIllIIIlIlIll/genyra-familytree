import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PersonNode, CreatePersonNodeDto, UpdatePersonNodeDto, UpdateCanvasPositionDto } from '@genyra/shared-types'

@Injectable()
export class PersonNodesService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PersonNode> {
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node) throw new NotFoundException('Person node not found')
    return this.toDto(node)
  }

  async createForUser(dto: CreatePersonNodeDto, userId: string): Promise<PersonNode> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { personNode: true },
    })
    if (!user?.personNode?.familyGroupId) {
      throw new ForbiddenException('User does not belong to a family group')
    }
    return this.create(dto, user.personNode.familyGroupId)
  }

  async create(dto: CreatePersonNodeDto, familyGroupId: string): Promise<PersonNode> {
    const node = await this.prisma.personNode.create({
      data: {
        displayName: dto.displayName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        birthPlace: dto.birthPlace ?? null,
        deathDate: dto.deathDate ? new Date(dto.deathDate) : null,
        bio: dto.bio ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        isDeceased: dto.isDeceased ?? false,
        isPlaceholder: dto.isPlaceholder ?? false,
        canvasX: dto.canvasX ?? 0,
        canvasY: dto.canvasY ?? 0,
        userId: dto.userId ?? null,
        familyGroupId,
      },
    })
    return this.toDto(node)
  }

  async update(
    id: string,
    dto: UpdatePersonNodeDto,
    requestingUserId: string,
  ): Promise<PersonNode> {
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node) throw new NotFoundException('Person node not found')

    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    const isSelf = node.userId === requestingUserId
    const isFamilyHead = user?.role === 'FAMILY_HEAD'

    if (!isSelf && !isFamilyHead) {
      throw new ForbiddenException('You can only edit your own profile')
    }

    const updateData: Prisma.PersonNodeUpdateInput = {
      ...(dto.displayName !== undefined && { displayName: dto.displayName }),
      ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
      ...(dto.birthPlace !== undefined && { birthPlace: dto.birthPlace }),
      ...(dto.deathDate !== undefined && { deathDate: dto.deathDate ? new Date(dto.deathDate) : null }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      ...(dto.isDeceased !== undefined && { isDeceased: dto.isDeceased }),
      ...(dto.isPlaceholder !== undefined && { isPlaceholder: dto.isPlaceholder }),
    }

    const updated = await this.prisma.personNode.update({
      where: { id },
      data: updateData,
    })
    return this.toDto(updated)
  }

  async updateCanvasPosition(
    id: string,
    dto: UpdateCanvasPositionDto,
  ): Promise<PersonNode> {
    const updated = await this.prisma.personNode.update({
      where: { id },
      data: { canvasX: dto.canvasX, canvasY: dto.canvasY },
    })
    return this.toDto(updated)
  }

  async delete(id: string, requestingUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    if (user?.role !== 'FAMILY_HEAD') {
      throw new ForbiddenException('Only Family Head can delete person nodes')
    }
    await this.prisma.personNode.delete({ where: { id } })
  }

  private toDto(node: {
    id: string
    displayName: string
    gender: 'MALE' | 'FEMALE' | null
    surname: string | null
    nik: string | null
    birthDate: Date | null
    birthPlace: string | null
    deathDate: Date | null
    bio: string | null
    avatarUrl: string | null
    isDeceased: boolean
    isPlaceholder: boolean
    canvasX: number
    canvasY: number
    userId: string | null
    familyGroupId: string | null
    createdAt: Date
    updatedAt: Date
  }): PersonNode {
    return {
      id: node.id,
      displayName: node.displayName,
      gender: node.gender ?? null,
      surname: node.surname ?? null,
      nik: node.nik ?? null,
      birthDate: node.birthDate?.toISOString() ?? null,
      birthPlace: node.birthPlace,
      deathDate: node.deathDate?.toISOString() ?? null,
      bio: node.bio,
      avatarUrl: node.avatarUrl,
      isDeceased: node.isDeceased,
      isPlaceholder: node.isPlaceholder,
      canvasX: node.canvasX,
      canvasY: node.canvasY,
      userId: node.userId,
      familyGroupId: node.familyGroupId,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    }
  }
}
