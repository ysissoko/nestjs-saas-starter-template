import { Services } from '@common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private logger = new Logger(FacebookStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get(`${Services.App}.auth.facebook.clientID`),
      clientSecret: configService.get(
        `${Services.App}.auth.facebook.clientSecret`,
      ),
      callbackURL: configService.get(
        `${Services.App}.auth.facebook.callbackURL`,
      ),
      scope: ['email', 'public_profile'],
      profileFields: [
        'id',
        'emails',
        'name',
        'displayName',
        'photos',
        'gender',
      ],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ): Promise<any> {
    try {
      this.logger.log(
        `Validating Facebook user: ${profile.emails?.[0]?.value}`,
      );

      const { id, emails, name, photos, gender } = profile;

      if (!emails || emails.length === 0) {
        throw new Error('Email not provided by Facebook');
      }

      const user = {
        facebookId: id,
        email: emails[0].value,
        firstName: name?.givenName,
        lastName: name?.familyName,
        picture: photos?.[0]?.value,
        gender,
        accessToken,
      };

      const validatedUser = await this.authService.validateFacebookUser(user);

      done(null, validatedUser);
    } catch (error) {
      this.logger.error(`Facebook authentication error: ${error.message}`);
      done(error, false);
    }
  }
}
