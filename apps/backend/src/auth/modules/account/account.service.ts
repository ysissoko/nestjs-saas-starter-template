import { Account, AccountState } from '@auth/modules/account/account.entity';
import { Otp } from '@auth/entities/otp.entity';
import { Gender, Profile } from '@auth/modules/account/profile.entity';
import { OtpService } from '@auth/services/otp.service';
import { TokenService } from '@auth/services/token.service';
import {
  BaseService,
  CheckPermissionDTO,
  ID,
  Services,
  UpdateAccountException,
} from '@common';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailService } from '@services/email.service';
import * as bcrypt from 'bcrypt';
import { isPast } from 'date-fns';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { CaslAbilityService } from '../permission/casl-ability.service';
import { RoleService } from '../role/role.service';
import { AuditLogService } from '@auth/services/audit-log.service';

export enum RequestOtpType {
  RESET_PASSWORD = 'reset-password',
  VERIFY_EMAIL = 'verify-email',
}
@Injectable()
export class AccountService extends BaseService<Account> {
  private logger: Logger = new Logger(AccountService.name);

  private otpEnabled: boolean;

  constructor(
    private readonly caslAbilityService: CaslAbilityService,
    private readonly configService: ConfigService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly roleService: RoleService,
    private readonly auditLogService: AuditLogService,
  ) {
    super(accountRepository);

    this.otpEnabled = this.configService.get<boolean>(
      `${Services.App}.auth.otp.enabled`,
    );
  }

  findByEmail(email: string) {
    return this.accountRepository.findOne({ where: { email } });
  }

  findByGoogleId(googleId: string) {
    return this.accountRepository.findOne({ where: { googleId } });
  }

  findByFacebookId(facebookId: string) {
    return this.accountRepository.findOne({ where: { facebookId } });
  }

  async findOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
    gender?: string;
  }): Promise<Account> {
    this.logger.debug(
      `Finding or creating Google user with email: ${googleUser.email}`,
    );

    // First, try to find by Google ID
    let account = await this.findByGoogleId(googleUser.googleId);

    // If not found by Google ID, try to find by email
    if (!account) {
      account = await this.findByEmail(googleUser.email);

      // If found by email, link the Google ID
      if (account) {
        this.logger.debug(
          `Linking Google ID to existing account: ${account.email}`,
        );
        account.googleId = googleUser.googleId;

        // Update profile photo if not set
        if (googleUser.picture && !account.profile?.photoUrl) {
          account.profile.photoUrl = googleUser.picture;
        }

        // Update gender if not set and provided by Google
        if (googleUser.gender && !account.profile?.gender) {
          const gender = this.mapGenderToEnum(googleUser.gender);
          if (gender) {
            account.profile.gender = gender;
          }
        }

        return account.save();
      }
    }

    // If account exists, return it
    if (account) {
      return account;
    }

    // Create new account for Google user
    this.logger.debug(
      `Creating new account for Google user: ${googleUser.email}`,
    );

    // Create profile
    const profile = new Profile();
    profile.firstname = googleUser.firstName || '';
    profile.lastname = googleUser.lastName || '';
    profile.photoUrl = googleUser.picture;

    // Map Google gender to our Gender enum
    const gender = this.mapGenderToEnum(googleUser.gender);
    if (gender) {
      profile.gender = gender;
    }

    await profile.save();

    // Create account
    account = new Account();
    account.email = googleUser.email;
    account.googleId = googleUser.googleId;
    account.profile = profile;
    account.accountState = AccountState.VERIFIED; // Google accounts are pre-verified
    account.role = await this.roleService.findOne({
      where: { name: 'member' },
      select: { id: true },
    });

    // Get default role (you might want to configure this)
    // For now, we'll set it to null and let the database handle the default
    // If you have a default role, fetch it here

    return account.save();
  }

  async findOrCreateFacebookUser(facebookUser: {
    facebookId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
    gender?: string;
  }): Promise<Account> {
    this.logger.debug(
      `Finding or creating Facebook user with email: ${facebookUser.email}`,
    );

    // First, try to find by Facebook ID
    let account = await this.findByFacebookId(facebookUser.facebookId);

    // If not found by Facebook ID, try to find by email
    if (!account) {
      account = await this.findByEmail(facebookUser.email);

      // If found by email, link the Facebook ID
      if (account) {
        this.logger.debug(
          `Linking Facebook ID to existing account: ${account.email}`,
        );
        account.facebookId = facebookUser.facebookId;

        // Update profile photo if not set
        if (facebookUser.picture && !account.profile?.photoUrl) {
          account.profile.photoUrl = facebookUser.picture;
        }

        // Update gender if not set and provided by Facebook
        if (facebookUser.gender && !account.profile?.gender) {
          const gender = this.mapGenderToEnum(facebookUser.gender);
          if (gender) {
            account.profile.gender = gender;
          }
        }

        return account.save();
      }
    }

    // If account exists, return it
    if (account) {
      return account;
    }

    // Create new account for Facebook user
    this.logger.debug(
      `Creating new account for Facebook user: ${facebookUser.email}`,
    );

    // Create profile
    const profile = new Profile();
    profile.firstname = facebookUser.firstName || '';
    profile.lastname = facebookUser.lastName || '';
    profile.photoUrl = facebookUser.picture;

    // Map Facebook gender to our Gender enum
    const gender = this.mapGenderToEnum(facebookUser.gender);
    if (gender) {
      profile.gender = gender;
    }

    await profile.save();

    // Create account
    account = new Account();
    account.email = facebookUser.email;
    account.facebookId = facebookUser.facebookId;
    account.profile = profile;
    account.accountState = AccountState.VERIFIED; // Facebook accounts are pre-verified
    account.role = await this.roleService.findOne({
      where: { name: 'member' },
      select: { id: true },
    });

    // Get default role (you might want to configure this)
    // For now, we'll set it to null and let the database handle the default
    // If you have a default role, fetch it here

    return account.save();
  }

  private mapGenderToEnum(gender?: string): Gender | null {
    if (!gender) return null;

    const genderLower = gender.toLowerCase();
    if (genderLower === 'male') {
      return Gender.MALE;
    } else if (genderLower === 'female') {
      return Gender.FEMALE;
    }
    return null;
  }

  async updateRole(
    accountId: ID,
    roleId: ID,
    actor?: Account,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      // Get the account with current role before update
      const accountBefore = await this.accountRepository.findOne({
        where: { id: accountId },
        relations: ['role'],
      });

      if (!accountBefore) {
        throw new Error(`Account with id ${accountId} not found`);
      }

      const oldRoleId = accountBefore.role?.id;

      // Update the role
      await this.accountRepository.update(accountId, { role: { id: roleId } });

      // Get the updated account with new role
      const accountAfter = await this.accountRepository.findOne({
        where: { id: accountId },
        relations: ['role'],
      });

      // Audit log
      if (actor) {
        await this.auditLogService.logRoleAssignment(
          actor,
          accountId,
          roleId,
          oldRoleId,
          ipAddress,
          userAgent,
        );
      }

      return accountAfter;
    } catch (error) {
      const msg = `Error updating account ${accountId} role to ${roleId}`;
      this.logger.error(msg, error);
      throw new UpdateAccountException(msg);
    }
  }

  async checkPermission(dto: CheckPermissionDTO): Promise<boolean> {
    const { userId, action, subject, field } = dto;
    const user: Account = await this.accountRepository.findOneOrFail({
      where: { id: userId },
      relations: ['role'],
    });
    return this.caslAbilityService.checkUserAbility(
      user,
      action,
      subject,
      field,
    );
  }

  async verifyOtp(accountOtp: Otp, otp: string) {
    if (!accountOtp) {
      throw new BadRequestException('OTP not generated for account');
    }

    if (!otp) {
      throw new BadRequestException('OTP is required');
    }

    const match = await bcrypt.compare(otp, accountOtp.code);
    if (!match) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Check if the OTP is expired
    if (isPast(accountOtp.expiry)) {
      throw new UnauthorizedException(
        'OTP code expired. Please request a new one.',
      );
    }
  }

  async resendVerificationEmail(email: string) {
    const account: Account = await this.findByEmail(email);
    if (!account) {
      throw new BadRequestException('Account not found');
    }

    if (account.accountState === AccountState.VERIFIED) {
      throw new BadRequestException('Account already verified');
    }

    // Generate a new token
    const token = this.tokenService.generateVerifyEmailToken(email);
    // Update the account with the new token
    account.emailVerificationToken = token;
    account.save();

    let plainOtpCode = null;

    // If OTP is enabled, send the OTP code as well
    if (this.otpEnabled) {
      this.logger.debug('Sending OTP code email');
      const otp: Otp = this.otpService.generateOtpCode();
      plainOtpCode = otp.code;

      const salt = await bcrypt.genSalt();
      otp.code = await bcrypt.hash(plainOtpCode, salt);

      account.otp = await otp.save();

      await account.save();
    }

    // Send the email
    this.emailService
      .sendVerificationEmail({ email, token, otp: plainOtpCode })
      .pipe(
        catchError((error) => {
          this.logger.error(
            `Failed to send verification email to ${account.email}`,
            error,
          );

          // Handle security: Reset the token if email sending fails
          this.tokenService
            .resetEmailVerificationToken(account)
            .catch((err) => {
              this.logger.error(
                'Failed to reset tokens after email error',
                err,
              );
            });

          // Return a failed observable but don't expose internal errors
          return throwError(
            () => new Error('Failed to send verification information'),
          );
        }),
      )
      .subscribe({
        next: (response) =>
          this.logger.debug('Email sending process completed'),
        error: (err) =>
          this.logger.error('Unexpected error in email sending process', err),
        complete: () => this.logger.debug('Email sending observable completed'),
      });
  }

  async verifyAccount(token: string, otp?: string | undefined) {
    const { email } = await this.tokenService.decodeEmailVerificationToken(
      token,
    );
    this.logger.debug(
      `Decoded email verification token: ${JSON.stringify(email)}`,
    );
    // Find the account by email
    const account: Account = await this.accountRepository.findOneOrFail({
      where: { email },
    });

    if (!account) {
      throw new BadRequestException('Account not found');
    }

    if (this.otpEnabled) {
      this.logger.debug('OTP is enabled for email verification');
      this.logger.debug(`OTP code provided: ${otp}`);
      await this.verifyOtp(account.otp, otp);
    }

    // Check if the account is already verified
    if (account.accountState === AccountState.VERIFIED) {
      throw new BadRequestException('Account already verified');
    }

    // Check if the token is the same as the one stored in the account
    if (account.emailVerificationToken !== token) {
      throw new UnauthorizedException(
        'Invalid token. Please request a new one',
      );
    }

    // Update the account state to verified
    account.accountState = AccountState.VERIFIED;
    // Invalidate the token
    this.tokenService.resetEmailVerificationToken(account).catch((err) => {
      this.logger.error('Failed to reset tokens after email error', err);
    });

    // Return the account
    return { error: false, message: 'account verified' };
  }

  async resetPassword(token: string, password: string) {
    const { email } = this.tokenService.decodeResetPasswordToken(token);
    this.logger.debug(`Decoded reset password token: ${JSON.stringify(email)}`);
    // Find the account by email
    const account: Account = await this.accountRepository.findOneOrFail({
      where: { email },
    });

    if (account.resetPasswordToken !== token) {
      throw new UnauthorizedException(
        'Invalid token. Please request a new one',
      );
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the password
    account.password = hashedPassword;

    // Save the account with new password
    await account.save();

    // Clear the reset token
    this.tokenService.resetPasswordToken(account).catch((err) => {
      this.logger.error('Failed to reset tokens after password reset', err);
    });

    return { error: false, message: 'Password reset successfully' };
  }

  async forgotPassword(email: string) {
    // Find the account by email
    const account: Account = await this.accountRepository.findOne({
      where: { email },
    });

    if (!account) {
      throw new BadRequestException('Account not found');
    }

    if (account.accountState !== AccountState.VERIFIED) {
      throw new Error('Account not verified');
    }

    const otp = this.otpService.generateOtpCode();
    const plainOtpCode = otp.code;

    const salt = await bcrypt.genSalt();
    otp.code = await bcrypt.hash(plainOtpCode, salt);

    const token = this.tokenService.generateResetPasswordToken(email);
    // Update the token in the account
    account.resetPasswordToken = token;
    account.otp = await otp.save();

    account.save();

    this.emailService
      .sendResetPasswordEmail({
        email: account.email,
        token,
        otp: plainOtpCode,
      })
      .pipe(
        catchError((error) => {
          this.logger.error(
            `Failed to send password reset email to ${account.email}`,
            error,
          );

          // Handle security: Reset the token if email sending fails
          this.tokenService.resetPasswordToken(account).catch((err) => {
            this.logger.error('Failed to reset tokens after email error', err);
          });

          // Return a failed observable but don't expose internal errors
          return throwError(
            () => new Error('Failed to send password reset information'),
          );
        }),
      )
      .subscribe({
        next: (response) =>
          this.logger.debug('Email sending process completed', response),
        error: (err) =>
          this.logger.error('Unexpected error in email sending process', err),
        complete: () => this.logger.debug('Email sending observable completed'),
      });

    return { error: false, message: 'Password reset email sent successfully' };
  }

  async requestOtp(token: string, requestType: RequestOtpType) {
    const { email } =
      requestType == RequestOtpType.RESET_PASSWORD
        ? this.tokenService.decodeResetPasswordToken(token)
        : this.tokenService.decodeEmailVerificationToken(token);
    this.logger.debug(`Decoded reset password token: ${JSON.stringify(email)}`);
    // Find the account by email
    const account: Account = await this.accountRepository.findOne({
      where: { email },
    });
    if (!account) {
      throw new BadRequestException('Account not found');
    }
    const otp = this.otpService.generateOtpCode();
    const plainOtpCode = otp.code;

    const salt = await bcrypt.genSalt();
    otp.code = await bcrypt.hash(plainOtpCode, salt);

    account.otp = await otp.save();
    account.save();

    this.emailService
      .sendOtpEmail({ email: account.email, otp: plainOtpCode })
      .pipe(
        catchError((error) => {
          this.logger.error(
            `Failed to send password reset email to ${account.email}`,
            error,
          );

          // Handle security: Reset the token if email sending fails
          this.tokenService.resetPasswordToken(account).catch((err) => {
            this.logger.error('Failed to reset tokens after email error', err);
          });

          // Return a failed observable but don't expose internal errors
          return throwError(
            () => new Error('Failed to send password reset information'),
          );
        }),
      )
      .subscribe({
        next: (response) =>
          this.logger.debug('Email sending process completed', response),
        error: (err) =>
          this.logger.error('Unexpected error in email sending process', err),
        complete: () => this.logger.debug('Email sending observable completed'),
      });
  }

  getTokenInfo(token: string, requestType: RequestOtpType) {
    return requestType == RequestOtpType.RESET_PASSWORD
      ? this.tokenService.decodeResetPasswordToken(token)
      : this.tokenService.decodeEmailVerificationToken(token);
  }

  async updateProfile(
    id: number,
    profileData: Partial<Profile>,
  ): Promise<Account> {
    // Find the account with profile
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    this.logger.log(
      `Fetched account for profile update: ${JSON.stringify(account)}`,
    );

    if (!account || !account.profile) {
      throw new Error('Account or profile not found');
    }

    // Update profile properties
    account.profile = Object.assign(account.profile, profileData);
    this.logger.debug(
      `Updating profile for account ${id}: ${JSON.stringify(account.profile)}`,
    );

    // Save account which will cascade to profile
    return account.save();
  }

  /**
   * @brief Saves the Stripe customer ID to the account.
   * This method retrieves the account by ID, updates the Stripe customer ID,
   * @param id the account ID
   * @param customerId the stripe customer ID
   * @returns Promise<Account>
   * @throws BadRequestException if the account is not found or if saving fails
   */
  saveCustomerId(id: number, customerId: string) {
    this.logger.debug(
      `Saving Stripe customer ID ${customerId} for account ${id}`,
    );
    return this.accountRepository
      .findOneOrFail({ where: { id } })
      .then((account) => {
        if (!account) {
          throw new BadRequestException('Account not found');
        }
        account.stripeCustomerId = customerId;
        return this.accountRepository.save(account);
      })
      .catch((error) => {
        this.logger.error(`Error saving customer ID for account ${id}:`, error);
        throw new BadRequestException('Failed to save customer ID');
      });
  }

  async getUserStripeCustomerId(id: number): Promise<string | null> {
    this.logger.debug(`Retrieving Stripe customer ID for user ${id}`);
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      this.logger.warn(`Account not found for user ID ${id}`);
      return null;
    }
    this.logger.debug(
      `Found Stripe customer ID: ${account.stripeCustomerId} for user ${id}`,
    );
    return account.stripeCustomerId || null;
  }
}
