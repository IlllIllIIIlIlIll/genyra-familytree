import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import type { GoogleProfile } from './strategies/google.strategy'
import type { JwtPayload } from '../common/decorators/current-user.decorator'
import type { AuthTokens } from '@genyra/shared-types'

interface ExchangePayload {
  purpose:   'exchange'
  accountId: string
}

interface SelectPayload {
  purpose:   'select'
  accountId: string
}

export interface NikPersona {
  nik:         string
  displayName: string
  families:    Array<{ id: string; name: string }>
}

export interface ExchangeResult {
  isAdmin:      boolean
  sessionToken: string
  personas:     NikPersona[]
}

/** Parses simple "7d" / "15m" / "30s" / "1h" duration strings (the only
 * formats used by JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN) into ms. */
function parseDurationMs(input: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(input.trim())
  if (!match) throw new Error(`Unsupported duration format: "${input}"`)
  const value = Number(match[1])
  const unitMs = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd']
  return value * unitMs
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private get accessSecret(): string {
    const secret = process.env['JWT_ACCESS_SECRET']
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured')
    return secret
  }

  private get refreshSecret(): string {
    const secret = process.env['JWT_REFRESH_SECRET']
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured')
    return secret
  }

  /** Called from the Google OAuth callback. Finds or creates (or "claims", if
   * an admin pre-provisioned this email) the Account, and returns a short-lived
   * one-time exchange code for the frontend to redeem via POST /auth/exchange. */
  async handleGoogleLogin(profile: GoogleProfile): Promise<string> {
    let account = await this.prisma.account.findUnique({ where: { email: profile.email } })

    if (!account) {
      account = await this.prisma.account.create({
        data: {
          email:     profile.email,
          googleId:  profile.googleId,
          name:      profile.name ?? null,
          avatarUrl: profile.avatarUrl ?? null,
        },
      })
    } else if (!account.googleId) {
      // Pre-provisioned by an admin (linked by email before first login) — claim it.
      account = await this.prisma.account.update({
        where: { id: account.id },
        data: {
          googleId:  profile.googleId,
          name:      profile.name ?? account.name,
          avatarUrl: profile.avatarUrl ?? account.avatarUrl,
        },
      })
    }

    const exchangePayload: ExchangePayload = { purpose: 'exchange', accountId: account.id }
    return this.jwtService.signAsync(exchangePayload, { secret: this.accessSecret, expiresIn: '60s' })
  }

  async exchange(code: string): Promise<ExchangeResult> {
    const payload = await this.verifyShortLived<ExchangePayload>(code, 'exchange')

    const account = await this.prisma.account.findUnique({
      where:   { id: payload.accountId },
      include: { nikLinks: true },
    })
    if (!account) throw new UnauthorizedException('Account not found')

    const personas: NikPersona[] = []
    if (!account.isAdmin) {
      for (const link of account.nikLinks) {
        const nodes = await this.prisma.personNode.findMany({
          where:   { nikId: link.nik },
          include: { familyGroup: { select: { id: true, name: true } } },
        })
        personas.push({
          nik:         link.nik,
          displayName: nodes[0]?.displayName ?? link.nik,
          families:    nodes
            .filter((n) => n.familyGroup)
            .map((n) => ({ id: n.familyGroup!.id, name: n.familyGroup!.name })),
        })
      }
    }

    const sessionPayload: SelectPayload = { purpose: 'select', accountId: account.id }
    const sessionToken = await this.jwtService.signAsync(sessionPayload, {
      secret: this.accessSecret,
      expiresIn: '10m',
    })

    return { isAdmin: account.isAdmin, sessionToken, personas }
  }

  async selectAdmin(sessionToken: string): Promise<AuthTokens> {
    const { accountId } = await this.verifyShortLived<SelectPayload>(sessionToken, 'select')

    const account = await this.prisma.account.findUnique({ where: { id: accountId } })
    if (!account) throw new UnauthorizedException('Account not found')
    if (!account.isAdmin) throw new ForbiddenException('This account is not an admin account')

    return this.generateTokens(accountId, { isAdmin: true })
  }

  async selectNik(sessionToken: string, nik: string, familyGroupId: string): Promise<AuthTokens> {
    const { accountId } = await this.verifyShortLived<SelectPayload>(sessionToken, 'select')

    const link = await this.prisma.nikLink.findUnique({
      where: { accountId_nik: { accountId, nik } },
    })
    if (!link) throw new ForbiddenException('This Google account is not linked to that NIK')

    const identity = await this.prisma.nikIdentity.findUnique({ where: { nik } })
    if (!identity) throw new UnauthorizedException('NIK not found')
    if (identity.status === 'DEACTIVATED') throw new ForbiddenException('This NIK has been deactivated')

    const node = await this.prisma.personNode.findFirst({ where: { nikId: nik, familyGroupId } })
    if (!node) throw new ForbiddenException('This NIK is not a member of that family')

    if (identity.activeAccountId && identity.activeAccountId !== accountId) {
      const holder = await this.prisma.account.findUnique({ where: { id: identity.activeAccountId } })
      // A holder only actually blocks this select while their refresh token is
      // still live — checking mere presence of a token hash is wrong, since it
      // stays set forever unless the holder explicitly logs out (most users
      // just close the tab), which would otherwise lock the NIK permanently.
      const holderStillActive = !!holder?.refreshToken
        && !!holder.refreshTokenExpiresAt
        && holder.refreshTokenExpiresAt > new Date()
      if (holderStillActive) {
        throw new ForbiddenException('This profile is currently active on another Google account')
      }
    }

    await this.prisma.nikIdentity.update({
      where: { nik },
      data:  { activeAccountId: accountId },
    })

    return this.generateTokens(accountId, { isAdmin: false, nik, fid: familyGroupId })
  }

  async refreshTokens(payload: JwtPayload, refreshToken: string): Promise<AuthTokens> {
    const account = await this.prisma.account.findUnique({ where: { id: payload.sub } })
    if (!account?.refreshToken) throw new UnauthorizedException()

    const tokenValid = await argon2.verify(account.refreshToken, refreshToken)
    if (!tokenValid) throw new UnauthorizedException('Invalid refresh token')

    if (payload.isAdmin) {
      return this.generateTokens(account.id, { isAdmin: true })
    }
    if (!payload.nik || !payload.fid) throw new UnauthorizedException()
    return this.generateTokens(account.id, { isAdmin: false, nik: payload.nik, fid: payload.fid })
  }

  async logout(payload: JwtPayload): Promise<void> {
    if (payload.nik) {
      await this.prisma.nikIdentity.updateMany({
        where: { nik: payload.nik, activeAccountId: payload.sub },
        data:  { activeAccountId: null },
      })
    }
    await this.prisma.account.update({
      where: { id: payload.sub },
      data:  { refreshToken: null, refreshTokenExpiresAt: null, activeNik: null },
    })
  }

  async switchFamily(payload: JwtPayload, familyGroupId: string): Promise<AuthTokens> {
    if (payload.isAdmin || !payload.nik) throw new ForbiddenException('Not a personal account session')

    const node = await this.prisma.personNode.findFirst({
      where: { nikId: payload.nik, familyGroupId },
    })
    if (!node) throw new ForbiddenException('Not a member of this family')

    return this.generateTokens(payload.sub, { isAdmin: false, nik: payload.nik, fid: familyGroupId })
  }

  async getMyFamilies(nik: string): Promise<Array<{ id: string; name: string }>> {
    const nodes = await this.prisma.personNode.findMany({
      where:   { nikId: nik, familyGroupId: { not: null } },
      include: { familyGroup: { select: { id: true, name: true } } },
    })
    return nodes
      .filter((n) => n.familyGroup)
      .map((n) => ({ id: n.familyGroup!.id, name: n.familyGroup!.name }))
  }

  private async verifyShortLived<T extends { purpose: string }>(
    token: string,
    purpose: T['purpose'],
  ): Promise<T> {
    let payload: T
    try {
      payload = await this.jwtService.verifyAsync<T>(token, { secret: this.accessSecret })
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
    if (payload.purpose !== purpose) throw new UnauthorizedException('Invalid token')
    return payload
  }

  private async generateTokens(
    accountId: string,
    scope: { isAdmin: true } | { isAdmin: false; nik: string; fid: string },
  ): Promise<AuthTokens> {
    const payload: JwtPayload = scope.isAdmin
      ? { sub: accountId, isAdmin: true }
      : { sub: accountId, isAdmin: false, nik: scope.nik, fid: scope.fid }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:    this.accessSecret,
        expiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret:    this.refreshSecret,
        expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
      }),
    ])

    const hashedRefresh = await argon2.hash(refreshToken)
    const refreshTtlMs = parseDurationMs(process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d')
    await this.prisma.account.update({
      where: { id: accountId },
      data:  {
        refreshToken: hashedRefresh,
        refreshTokenExpiresAt: new Date(Date.now() + refreshTtlMs),
        activeNik: scope.isAdmin ? null : scope.nik,
      },
    })

    return { accessToken, refreshToken }
  }
}
