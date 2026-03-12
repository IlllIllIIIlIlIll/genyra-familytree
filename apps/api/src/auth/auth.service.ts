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
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })
    if (existingEmail) {
      throw new BadRequestException('Email already registered')
    }

    const existingNik = await this.prisma.user.findUnique({
      where: { nik: dto.nik },
    })
    if (existingNik) {
      throw new BadRequestException('NIK already registered')
    }

    const passwordHash = await argon2.hash(dto.password)

    await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        gender: dto.gender,
        surname: dto.surname,
        nik: dto.nik,
        birthDate: new Date(dto.birthDate),
        birthPlace: dto.birthPlace,
        status: 'ACTIVE',
      },
    })

    return { message: 'Registration successful. Please log in.' }
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (!user) throw new UnauthorizedException('Invalid credentials')

    const passwordValid = await argon2.verify(user.passwordHash, dto.password)
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials')

    if (user.status === 'DEACTIVATED') {
      throw new ForbiddenException('Account has been deactivated')
    }

    return this.generateTokens(user.id, user.email, user.role)
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user?.refreshToken) throw new UnauthorizedException()

    const tokenValid = await argon2.verify(user.refreshToken, refreshToken)
    if (!tokenValid) throw new UnauthorizedException('Invalid refresh token')

    return this.generateTokens(user.id, user.email, user.role)
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    })
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, role }

    const accessSecret = process.env['JWT_ACCESS_SECRET']
    const refreshSecret = process.env['JWT_REFRESH_SECRET']
    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets not configured')
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
      }),
    ])

    const hashedRefresh = await argon2.hash(refreshToken)
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefresh },
    })

    return { accessToken, refreshToken }
  }
}
