import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20'

export interface GoogleProfile {
  googleId:  string
  email:     string
  name?:     string
  avatarUrl?: string
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const clientID     = process.env['GOOGLE_CLIENT_ID']
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET']
    const callbackURL  = process.env['GOOGLE_CALLBACK_URL']
    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL must be set')
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    })
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value
    if (!email) {
      done(new Error('Google account has no email'), undefined)
      return
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      ...(profile.displayName          !== undefined && { name: profile.displayName }),
      ...(profile.photos?.[0]?.value   !== undefined && { avatarUrl: profile.photos[0].value }),
    }
    done(null, googleProfile)
  }
}
