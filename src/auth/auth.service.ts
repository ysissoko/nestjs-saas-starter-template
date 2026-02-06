import { Services } from '@common';
import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { Request, Response } from 'express';
import { AccountService } from './modules/account/account.service';
import { Account, AccountState } from './modules/account/account.entity';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const account: Account = await this.accountService.findByEmail(email);
    if (!account) throw new NotFoundException('auth/account-not-found');
    account.loginAttempts += 1;
    // Increment le nombre de tentative
    await account.save();

    if (account.accountState === AccountState.NOT_VERIFIED)
      throw new UnauthorizedException('auth/account-not-verified');

    if (account.accountState === AccountState.BLOCKED)
      throw new UnauthorizedException('auth/account-blocked');

    if (account && (await compare(password, account.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = account;
      account.loginAttempts = 0;
      // Reset the login attempts
      await account.save();
      return result;
    }

    const maxLoginAttempts = this.configService.get(
      `${Services.App}.auth.maxLoginAttempts`,
    );

    if (maxLoginAttempts) {
      // // If the user login attempts is greater than 3 we block the account
      if (account.loginAttempts >= maxLoginAttempts) {
        account.accountState = AccountState.BLOCKED;
        await account.save();
      }
    }

    return null;
  }

  async login(res, { email, role, id }: Account, shouldRedirect = false) {
    const payload = { email, sub: id, role: role };

    this.logger.debug(
      `current node env: ${this.configService.get<string>('NODE_ENV')}`,
    );
    // Set the HttpOnly cookie
    res.cookie('authToken', this.jwtService.sign(payload), {
      httpOnly: true, // Prevents JavaScript access
      secure: this.configService.get<string>('NODE_ENV') === 'production', // Use secure cookies in production
      maxAge: 3600000, // Cookie expiration time (1 hour)
      sameSite: 'strict', // Helps prevent CSRF attacks
    });

    // Redirect only for social logins (Google, Facebook)
    if (shouldRedirect) {
      res.redirect(
        this.configService.get<string>(`${Services.App}.frontend.url`),
      );
    } else {
      // For classic login, return JSON response
      res.status(200).json({
        message: 'Login successful',
        user: { email, role, id },
      });
    }
  }

  async logout(res: Response) {
    this.logger.log('Log out');
    // Clear the HttpOnly cookie
    res.cookie('authToken', '', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production', // Use secure cookies in production
      maxAge: 0, // Set maxAge to 0 to delete the cookie
      sameSite: 'strict', // Helps prevent CSRF attacks
    });

    res.status(200).json({ message: 'Logout successful' });
  }

  async me(
    email: string,
  ): Promise<Omit<Account, 'password' | 'loginAttempts' | 'accountState'>> {
    const result = await this.accountService.findByEmail(email);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, loginAttempts, accountState, ...userInfo } = result;
    return userInfo as Omit<
      Account,
      'password' | 'loginAttempts' | 'accountState'
    >;
  }

  async isAuthenticated(req: Request): Promise<boolean> {
    const token = req.cookies?.authToken;
    if (!token) {
      this.logger.warn('No session cookie found');
      return false;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          `${Services.App}.auth.jwt.secret`,
        ),
      });
      this.logger.debug(`Session cookie payload: ${JSON.stringify(payload)}`);
      return true;
    } catch (error) {
      this.logger.error('Invalid session cookie', error);
      return false;
    }
  }

  async validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
    gender?: string;
  }): Promise<Account> {
    try {
      this.logger.log(`Validating Google user: ${googleUser.email}`);

      const account = await this.accountService.findOrCreateGoogleUser(
        googleUser,
      );

      if (account.accountState === AccountState.BLOCKED) {
        throw new UnauthorizedException('auth/account-blocked');
      }

      return account;
    } catch (error) {
      this.logger.error(`Error validating Google user: ${error.message}`);
      throw error;
    }
  }

  async validateFacebookUser(facebookUser: {
    facebookId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
    gender?: string;
  }): Promise<Account> {
    try {
      this.logger.log(`Validating Facebook user: ${facebookUser.email}`);

      const account = await this.accountService.findOrCreateFacebookUser(
        facebookUser,
      );

      if (account.accountState === AccountState.BLOCKED) {
        throw new UnauthorizedException('auth/account-blocked');
      }

      return account;
    } catch (error) {
      this.logger.error(`Error validating Facebook user: ${error.message}`);
      throw error;
    }
  }
}
