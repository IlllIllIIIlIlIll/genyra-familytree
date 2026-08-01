import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import type { FastifyReply } from 'fastify'
import { z } from 'zod'
import { AuthService, type ExchangeResult } from './auth.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'
import type { GoogleProfile } from './strategies/google.strategy'
import type { AuthTokens } from '@genyra/shared-types'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @ApiExcludeEndpoint()
  googleLogin(@Res() reply: FastifyReply): void {
    // Built manually (not via AuthGuard('google')) because passport-oauth2's
    // redirect step calls res.setHeader, which Fastify's reply object doesn't
    // implement — it only exists on Node's raw http.ServerResponse/Express res.
    const clientID = process.env['GOOGLE_CLIENT_ID']
    const callbackURL = process.env['GOOGLE_CALLBACK_URL']
    if (!clientID || !callbackURL) throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CALLBACK_URL not configured')

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientID)
    url.searchParams.set('redirect_uri', callbackURL)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'email profile')
    reply.redirect(url.toString(), 302)
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleCallback(
    @CurrentUser() profile: unknown,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const code = await this.authService.handleGoogleLogin(profile as GoogleProfile)
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'
    reply.redirect(`${frontendUrl}/auth/callback?code=${encodeURIComponent(code)}`, 302)
  }

  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a Google-login code for the account-selection persona list' })
  async exchange(@Body() body: unknown): Promise<ExchangeResult> {
    const { code } = z.object({ code: z.string().min(1) }).parse(body)
    return this.authService.exchange(code)
  }

  @Post('select-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize an admin session' })
  async selectAdmin(@Body() body: unknown): Promise<AuthTokens> {
    const { sessionToken } = z.object({ sessionToken: z.string().min(1) }).parse(body)
    return this.authService.selectAdmin(sessionToken)
  }

  @Post('select-nik')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize a personal session for a chosen NIK + family' })
  async selectNik(@Body() body: unknown): Promise<AuthTokens> {
    const { sessionToken, nik, familyGroupId } = z
      .object({ sessionToken: z.string().min(1), nik: z.string().min(1), familyGroupId: z.string().min(1) })
      .parse(body)
    return this.authService.selectNik(sessionToken, nik, familyGroupId)
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
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(body)
    return this.authService.refreshTokens(user, refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    await this.authService.logout(user)
    return { message: 'Logged out successfully' }
  }

  @Post('switch-family')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch active family (same NIK) and receive new tokens' })
  async switchFamily(
    @CurrentUser() user: JwtPayload,
    @Body() body: { familyGroupId: string },
  ): Promise<AuthTokens> {
    return this.authService.switchFamily(user, body.familyGroupId)
  }

  @Get('my-families')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all families the current session's NIK belongs to" })
  async myFamilies(@CurrentUser() user: JwtPayload): Promise<Array<{ id: string; name: string }>> {
    if (!user.nik) return []
    return this.authService.getMyFamilies(user.nik)
  }
}
