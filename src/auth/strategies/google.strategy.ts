import { Services } from '@common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private logger = new Logger(GoogleStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get(`${Services.App}.auth.google.clientID`),
      clientSecret: configService.get(
        `${Services.App}.auth.google.clientSecret`,
      ),
      callbackURL: configService.get(
        `${Services.App}.auth.google.callbackURL`,
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      this.logger.log(`Validating Google user: ${profile.emails[0].value}`);

      const { id, emails, displayName, photos } = profile;

      const user = {
        googleId: id,
        email: emails[0].value,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        displayName,
        picture: photos?.[0]?.value,
        accessToken,
      };

      const validatedUser = await this.authService.validateGoogleUser(user);

      done(null, validatedUser);
    } catch (error) {
      this.logger.error(`Google authentication error: ${error.message}`);
      done(error, false);
    }
  }
}
