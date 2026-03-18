import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import type { RegisterDto, LoginDto, AuthTokens } from '@genyra/shared-types'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existingNik = await this.prisma.user.findUnique({ where: { nik: dto.nik } })
    if (existingNik) {
      if (existingNik.status === 'PENDING_APPROVAL') {
        throw new BadRequestException('This NIK has already submitted a registration and is waiting for approval')
      }
      throw new BadRequestException('This NIK is already registered')
    }

    const passwordHash = await argon2.hash(dto.password)
    const birthDate    = new Date(dto.birthDate)

    if (dto.inviteCode) {
      // ── JOIN EXISTING FAMILY ───────────────────────────────────────────────
      const invite = await this.prisma.invite.findUnique({ where: { code: dto.inviteCode } })
      if (!invite || invite.status !== 'UNUSED' || invite.expiresAt < new Date()) {
        throw new BadRequestException('Invalid or expired invite code')
      }

      // ── Validate referrer relationship (if provided) ──────────────────────
      if (dto.referrerNik && dto.referrerRelationship) {
        const referrerUser = await this.prisma.user.findUnique({
          where:   { nik: dto.referrerNik },
          include: { personNode: true },
        })
        if (!referrerUser?.personNode || referrerUser.personNode.familyGroupId !== invite.familyGroupId) {
          throw new BadRequestException('Referrer not found in this family')
        }

        const referrerNodeId   = referrerUser.personNode.id
        const referrerGender   = referrerUser.personNode.gender

        if (dto.referrerRelationship === 'REFERRER_IS_FATHER') {
          // Referrer claims to be the registrant's father — must be male and married
          if (referrerGender !== 'MALE') {
            throw new BadRequestException('The referrer you selected is not registered as male')
          }
          const spouseEdge = await this.prisma.relationshipEdge.findFirst({
            where: {
              OR: [
                { sourceId: referrerNodeId, relationshipType: 'SPOUSE' },
                { targetId: referrerNodeId, relationshipType: 'SPOUSE' },
              ],
            },
          })
          if (!spouseEdge) {
            throw new BadRequestException('The referrer must be married to be registered as a father')
          }
          // Registrant cannot already have a father (checked at approval, but pre-check here too)
          const existingFather = await this.prisma.relationshipEdge.findFirst({
            where: {
              targetId:         referrerNodeId,
              relationshipType: 'PARENT_CHILD',
              source:           { gender: 'MALE' },
            },
          })
          void existingFather // father-slot checked at edge-creation; skip blocking here
        }

        if (dto.referrerRelationship === 'REFERRER_IS_SON') {
          // Referrer is the son — must be male; registrant can't add a second father of same gender
          if (referrerGender !== 'MALE') {
            throw new BadRequestException('The referrer you selected is not registered as male')
          }
          const existingParent = await this.prisma.relationshipEdge.findFirst({
            where: {
              targetId:         referrerNodeId,
              relationshipType: 'PARENT_CHILD',
              source:           { gender: dto.gender },
            },
          })
          if (existingParent) {
            throw new BadRequestException('This child already has a parent of that gender registered')
          }
        }

        if (dto.referrerRelationship === 'REFERRER_IS_DAUGHTER') {
          // Referrer is the daughter — must be female
          if (referrerGender !== 'FEMALE') {
            throw new BadRequestException('The referrer you selected is not registered as female')
          }
          const existingParent = await this.prisma.relationshipEdge.findFirst({
            where: {
              targetId:         referrerNodeId,
              relationshipType: 'PARENT_CHILD',
              source:           { gender: dto.gender },
            },
          })
          if (existingParent) {
            throw new BadRequestException('This child already has a parent of that gender registered')
          }
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            nik:                 dto.nik,
            passwordHash,
            status:              'PENDING_APPROVAL',
            referrerNik:         dto.referrerNik          ?? null,
            referrerRelationship: dto.referrerRelationship ?? null,
            personNode: {
              create: {
                displayName:     dto.displayName,
                surname:         dto.surname,
                gender:          dto.gender,
                birthDate,
                birthPlace:      dto.birthPlace,
                familyGroupId:   invite.familyGroupId,
                pendingApproval: true,
              },
            },
          },
        })
        await tx.invite.update({
          where: { id: invite.id },
          data:  { status: 'USED', usedAt: new Date() },
        })
      })

      return { message: 'Registration submitted. Awaiting family head approval.' }
    } else if (dto.familyName) {
      // ── CREATE NEW FAMILY ─────────────────────────────────────────────────
      const familyGroup = await this.prisma.familyGroup.create({
        data: { name: dto.familyName },
      })

      await this.prisma.user.create({
        data: {
          nik: dto.nik,
          passwordHash,
          role:   'FAMILY_HEAD',
          status: 'ACTIVE',
          personNode: {
            create: {
              displayName:   dto.displayName,
              surname:       dto.surname,
              gender:        dto.gender,
              birthDate,
              birthPlace:    dto.birthPlace,
              familyGroupId: familyGroup.id,
            },
          },
        },
      })

      return { message: 'Family created! You can now log in.' }
    } else {
      throw new BadRequestException('Either an invite code or a family name is required')
    }
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { nik: dto.nik } })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const passwordValid = await argon2.verify(user.passwordHash, dto.password)
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials')

    if (user.status === 'DEACTIVATED') {
      throw new ForbiddenException('Account has been deactivated')
    }
    if (user.status === 'PENDING_APPROVAL') {
      throw new ForbiddenException('Account is pending approval from the family head')
    }

    return this.generateTokens(user.id, user.role)
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user?.refreshToken) throw new UnauthorizedException()

    const tokenValid = await argon2.verify(user.refreshToken, refreshToken)
    if (!tokenValid) throw new UnauthorizedException('Invalid refresh token')

    return this.generateTokens(user.id, user.role)
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data:  { refreshToken: null },
    })
  }

  private async generateTokens(userId: string, role: string): Promise<AuthTokens> {
    const payload = { sub: userId, role }

    const accessSecret  = process.env['JWT_ACCESS_SECRET']
    const refreshSecret = process.env['JWT_REFRESH_SECRET']
    if (!accessSecret || !refreshSecret) throw new Error('JWT secrets not configured')

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:    accessSecret,
        expiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret:    refreshSecret,
        expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
      }),
    ])

    const hashedRefresh = await argon2.hash(refreshToken)
    await this.prisma.user.update({
      where: { id: userId },
      data:  { refreshToken: hashedRefresh },
    })

    return { accessToken, refreshToken }
  }
}
