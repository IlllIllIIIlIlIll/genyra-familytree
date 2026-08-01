import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { JwtPayload } from '../common/decorators/current-user.decorator'
import type { PersonNode, UpdatePersonNodeDto, UpdateCanvasPositionDto, AddChildDto } from '@genyra/shared-types'

function sanitizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('https://')) return url
  return null
}

@Injectable()
export class PersonNodesService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PersonNode> {
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node) throw new NotFoundException('Person node not found')
    return this.toDto(node)
  }

  async update(id: string, dto: UpdatePersonNodeDto, requester: JwtPayload): Promise<PersonNode> {
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node) throw new NotFoundException('Person node not found')
    if (!requester.nik || node.nikId !== requester.nik) {
      throw new ForbiddenException('You can only edit your own profile')
    }

    const updateData: Prisma.PersonNodeUpdateInput = {
      ...(dto.displayName !== undefined && { displayName: dto.displayName }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.surname !== undefined && { surname: dto.surname }),
      ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
      ...(dto.birthPlace !== undefined && { birthPlace: dto.birthPlace }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
    }

    const updated = await this.prisma.personNode.update({ where: { id }, data: updateData })
    return this.toDto(updated)
  }

  async updateCanvasPosition(
    id: string,
    dto: UpdateCanvasPositionDto,
    requester: JwtPayload,
  ): Promise<PersonNode> {
    const node = await this.prisma.personNode.findUnique({ where: { id } })
    if (!node) throw new NotFoundException('Person node not found')

    const isMember = node.familyGroupId
      ? await this.prisma.personNode.findFirst({
          where: { nikId: requester.nik ?? '__none__', familyGroupId: node.familyGroupId },
        })
      : null
    if (!isMember) throw new ForbiddenException('Not a member of this family')

    const updated = await this.prisma.personNode.update({
      where: { id },
      data: { canvasX: dto.canvasX, canvasY: dto.canvasY },
    })
    return this.toDto(updated)
  }

  async addChild(dto: AddChildDto, requester: JwtPayload): Promise<PersonNode> {
    if (!requester.nik || !requester.fid) throw new ForbiddenException('Not a personal account session')

    const activeNode = await this.prisma.personNode.findFirst({
      where: { nikId: requester.nik, familyGroupId: requester.fid },
    })
    if (!activeNode) throw new ForbiddenException('You must be in a family group to add a child')

    const spouseEdge = await this.prisma.relationshipEdge.findFirst({
      where: {
        OR: [
          { sourceId: activeNode.id, relationshipType: 'SPOUSE' },
          { targetId: activeNode.id, relationshipType: 'SPOUSE' },
        ],
      },
    })
    if (!spouseEdge) throw new BadRequestException('You must be married (have a spouse) to add a child')

    const spouseId = spouseEdge.sourceId === activeNode.id ? spouseEdge.targetId : spouseEdge.sourceId
    const familyGroupId = requester.fid

    const child = await this.prisma.$transaction(async (tx) => {
      const childNode = await tx.personNode.create({
        data: {
          displayName: dto.displayName,
          gender:      dto.gender ?? null,
          surname:     dto.surname,
          birthDate:   dto.birthDate ? new Date(dto.birthDate) : null,
          birthPlace:  dto.birthPlace ?? null,
          familyGroupId,
          isPlaceholder: false,
        },
      })

      await tx.relationshipEdge.createMany({
        data: [
          { sourceId: activeNode.id, targetId: childNode.id, relationshipType: 'PARENT_CHILD' },
          { sourceId: spouseId,      targetId: childNode.id, relationshipType: 'PARENT_CHILD' },
        ],
        skipDuplicates: true,
      })

      return childNode
    })

    return this.toDto(child)
  }

  async search(q: string, requester: JwtPayload): Promise<PersonNode[]> {
    const familyGroupId = requester.fid
    if (!familyGroupId) return []

    const nodes = await this.prisma.personNode.findMany({
      where: {
        familyGroupId,
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { surname:      { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
    })
    return nodes.map((n) => this.toDto(n))
  }

  private toDto(node: {
    id: string
    displayName: string
    gender: 'MALE' | 'FEMALE' | null
    surname: string | null
    birthDate: Date | null
    birthPlace: string | null
    deathDate: Date | null
    bio: string | null
    avatarUrl: string | null
    isDeceased: boolean
    isPlaceholder: boolean
    canvasX: number
    canvasY: number
    nikId: string | null
    familyGroupId: string | null
    createdAt: Date
    updatedAt: Date
  }): PersonNode {
    return {
      id: node.id,
      displayName: node.displayName,
      gender: node.gender ?? null,
      surname: node.surname ?? null,
      nik: node.nikId ?? null,
      birthDate: node.birthDate?.toISOString() ?? null,
      birthPlace: node.birthPlace,
      deathDate: node.deathDate?.toISOString() ?? null,
      bio: node.bio,
      avatarUrl: sanitizeAvatarUrl(node.avatarUrl),
      isDeceased: node.isDeceased,
      isPlaceholder: node.isPlaceholder,
      canvasX: node.canvasX,
      canvasY: node.canvasY,
      nikId: node.nikId,
      familyGroupId: node.familyGroupId,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    }
  }
}
