import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Invite } from '@genyra/shared-types'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function uniqueCode(prisma: PrismaService): Promise<string> {
  let code: string
  let attempts = 0
  do {
    code = generateInviteCode()
    attempts++
    if (attempts > 10) throw new BadRequestException('Could not generate a unique invite code')
  } while (await prisma.invite.findUnique({ where: { code } }))
  return code
}

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the single active invite for the family, creating one if none exists. */
  async getOrCreateForFamily(requestingUserId: string): Promise<Invite> {
    const user = await this.prisma.user.findUnique({
      where:   { id: requestingUserId },
      include: { personNodes: { where: { familyGroupId: { not: null } }, select: { familyGroupId: true }, take: 1 } },
    })
    if (user?.role !== 'FAMILY_HEAD') throw new ForbiddenException('Only Family Head can view invite codes')
    const familyGroupId = user.personNodes[0]?.familyGroupId
    if (!familyGroupId) throw new ForbiddenException('User has no family group')

    // Return the most recent invite regardless of status; only auto-create on first ever access
    const existing = await this.prisma.invite.findFirst({
      where:   { familyGroupId },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) return this.toDto(existing)

    // No invite has ever been created for this family — create the first one
    const code      = await uniqueCode(this.prisma)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const invite    = await this.prisma.invite.create({ data: { code, expiresAt, familyGroupId } })
    return this.toDto(invite)
  }

  /** Refreshes (or creates) the family invite: new code, reset to UNUSED, +7 day expiry. */
  async refreshForFamily(requestingUserId: string): Promise<Invite> {
    const user = await this.prisma.user.findUnique({
      where:   { id: requestingUserId },
      include: { personNodes: { where: { familyGroupId: { not: null } }, select: { familyGroupId: true }, take: 1 } },
    })
    if (user?.role !== 'FAMILY_HEAD') throw new ForbiddenException('Only Family Head can refresh invites')
    const familyGroupId = user.personNodes[0]?.familyGroupId
    if (!familyGroupId) throw new ForbiddenException('User has no family group')

    const code      = await uniqueCode(this.prisma)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const existing = await this.prisma.invite.findFirst({
      where:   { familyGroupId },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      const updated = await this.prisma.invite.update({
        where: { id: existing.id },
        data:  { code, status: 'UNUSED', expiresAt, usedAt: null },
      })
      return this.toDto(updated)
    }

    const created = await this.prisma.invite.create({ data: { code, expiresAt, familyGroupId } })
    return this.toDto(created)
  }

  async validate(code: string): Promise<{ valid: boolean; familyGroupId?: string }> {
    const invite = await this.prisma.invite.findUnique({ where: { code } })
    if (!invite || invite.status !== 'UNUSED' || invite.expiresAt < new Date()) {
      return { valid: false }
    }
    return { valid: true, familyGroupId: invite.familyGroupId }
  }

  private toDto(invite: {
    id: string; code: string; status: string; expiresAt: Date
    familyGroupId: string; createdAt: Date; usedAt: Date | null
  }): Invite {
    void invite.usedAt
    return {
      id:            invite.id,
      code:          invite.code,
      status:        invite.status as Invite['status'],
      expiresAt:     invite.expiresAt.toISOString(),
      familyGroupId: invite.familyGroupId,
      createdAt:     invite.createdAt.toISOString(),
    }
  }
}
