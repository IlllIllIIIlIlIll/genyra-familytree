import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { randomBytes } from 'crypto'

function generateShareToken(): string {
  return randomBytes(24).toString('base64url')
}

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  async createToken(requestingUserId: string): Promise<{ token: string; expiresAt: string }> {
    const headNode = await this.prisma.personNode.findFirst({
      where: { userId: requestingUserId, role: 'FAMILY_HEAD', familyGroupId: { not: null } },
      select: { familyGroupId: true },
    })
    if (!headNode?.familyGroupId) {
      throw new ForbiddenException('Only Family Head can create share links')
    }

    const token     = generateShareToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await this.prisma.shareToken.create({
      data: {
        token,
        familyGroupId:   headNode.familyGroupId,
        createdByUserId: requestingUserId,
        expiresAt,
      },
    })

    return { token, expiresAt: expiresAt.toISOString() }
  }

  async getPublicMapData(token: string): Promise<{
    familyName: string
    nodes: object[]
    edges: object[]
  }> {
    const record = await this.prisma.shareToken.findUnique({ where: { token } })
    if (!record || record.expiresAt < new Date()) {
      throw new NotFoundException('Share link is invalid or has expired')
    }

    const group = await this.prisma.familyGroup.findUnique({
      where: { id: record.familyGroupId },
    })
    if (!group) throw new NotFoundException('Family not found')

    const [nodes, edges] = await Promise.all([
      this.prisma.personNode.findMany({
        where: { familyGroupId: record.familyGroupId, pendingApproval: false },
        select: {
          id: true, displayName: true, gender: true, surname: true,
          birthDate: true, deathDate: true, isDeceased: true,
          isPlaceholder: true, avatarUrl: true, canvasX: true, canvasY: true,
        },
      }),
      this.prisma.relationshipEdge.findMany({
        where: {
          source: { familyGroupId: record.familyGroupId },
        },
        select: {
          id: true, sourceId: true, targetId: true, relationshipType: true,
        },
      }),
    ])

    return {
      familyName: group.name,
      nodes,
      edges,
    }
  }
}
