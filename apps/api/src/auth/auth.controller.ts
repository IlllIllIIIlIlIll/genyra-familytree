import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import { RegisterSchema, LoginSchema } from '@genyra/shared-types'
import type { RegisterDto, LoginDto, AuthTokens } from '@genyra/shared-types'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register with an invite code' })
  async register(@Body() body: unknown): Promise<{ message: string }> {
    const dto = RegisterSchema.parse(body) satisfies RegisterDto
    return this.authService.register(dto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive tokens' })
  async login(@Body() body: unknown): Promise<AuthTokens> {
    const dto = LoginSchema.parse(body) satisfies LoginDto
    return this.authService.login(dto)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ): Promise<AuthTokens> {
    const { refreshToken } = body as { refreshToken: string }
    return this.authService.refreshTokens(user.sub, refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    await this.authService.logout(user.sub)
    return { message: 'Logged out successfully' }
  }
}
