import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Invite } from '@genyra/shared-types'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'GEN-'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(requestingUserId: string): Promise<Invite> {
    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    if (user?.role !== 'FAMILY_HEAD') {
      throw new ForbiddenException('Only Family Head can generate invite codes')
    }
    if (!user.familyGroupId) {
      throw new ForbiddenException('User has no family group')
    }

    let code: string
    let attempts = 0
    do {
      code = generateInviteCode()
      attempts++
      if (attempts > 10) throw new Error('Could not generate a unique invite code')
    } while (await this.prisma.invite.findUnique({ where: { code } }))

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await this.prisma.invite.create({
      data: {
        code,
        expiresAt,
        familyGroupId: user.familyGroupId,
      },
    })

    return this.toDto(invite)
  }

  async validate(code: string): Promise<{ valid: boolean; familyGroupId?: string }> {
    const invite = await this.prisma.invite.findUnique({ where: { code } })
    if (!invite || invite.status !== 'UNUSED' || invite.expiresAt < new Date()) {
      return { valid: false }
    }
    return { valid: true, familyGroupId: invite.familyGroupId }
  }

  async listByGroup(familyGroupId: string, requestingUserId: string): Promise<Invite[]> {
    const user = await this.prisma.user.findUnique({ where: { id: requestingUserId } })
    if (user?.role !== 'FAMILY_HEAD' || user.familyGroupId !== familyGroupId) {
      throw new ForbiddenException('Access denied')
    }

    const invites = await this.prisma.invite.findMany({
      where: { familyGroupId },
      orderBy: { createdAt: 'desc' },
    })
    return invites.map((i) => this.toDto(i))
  }

  private toDto(invite: {
    id: string
    code: string
    status: string
    expiresAt: Date
    familyGroupId: string
    createdAt: Date
    usedAt: Date | null
  }): Invite {
    void invite.usedAt
    return {
      id: invite.id,
      code: invite.code,
      status: invite.status as Invite['status'],
      expiresAt: invite.expiresAt.toISOString(),
      familyGroupId: invite.familyGroupId,
      createdAt: invite.createdAt.toISOString(),
    }
  }
}
