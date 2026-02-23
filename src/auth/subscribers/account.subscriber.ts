import { Services } from '@common';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailService } from '@services/email.service';
import * as bcrypt from 'bcrypt';
import { catchError, throwError } from 'rxjs';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  Repository,
  UpdateEvent,
} from 'typeorm';
import { Account } from '../modules/account/account.entity';
import { OtpService } from '@auth/services/otp.service';
import { TokenService } from '@auth/services/token.service';

@EventSubscriber()
export class AccountSubscriber implements EntitySubscriberInterface<Account> {
  private logger = new Logger(AccountSubscriber.name);

  private plainOtpCode: string | null = null;

  constructor(
    dataSource: DataSource,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(OtpService) private readonly otpService: OtpService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Account;
  }

  async beforeInsert(event: InsertEvent<Account>) {
    await this.hashAccountPassword(event.entity as Account);
    this.formatUsername(event.entity);
    event.entity.emailVerificationToken =
      this.tokenService.generateVerifyEmailToken(event.entity.email);
    if (
      this.configService.get<boolean>(`${Services.App}.auth.otp.enabled`)
    ) {
      this.logger.debug('Generating OTP code for email verification');
      const otp = this.otpService.generateOtpCode();
      this.plainOtpCode = otp.code;
      otp.code = await this.hash(otp.code);
      event.entity.otp = await otp.save();
    }
  }

  async beforeUpdate(event: UpdateEvent<Account>) {
    if (
      event.entity.password &&
      event.entity.password !== event.databaseEntity.password
    ) {
      await this.hashAccountPassword(event.entity as Account);
    }

    this.formatUsername(event.entity as Account);
  }

  async afterInsert(event: InsertEvent<Account>) {
    const account = event.entity;

    if (!account.emailVerificationToken) {
      this.logger.error(
        `Email verification token not generated for account ${account.email}`,
      );
      return;
    }

    this.emailService
      .sendVerificationEmail({
        email: account.email,
        token: account.emailVerificationToken,
        otp: this.plainOtpCode,
      })
      .pipe(
        catchError((error) => {
          this.logger.error(
            `Failed to send password reset email to ${account.email}`,
            error,
          );

          // Just log the error - token expiration handles security
          // No need to invalidate tokens immediately

          return throwError(
            () => new Error('Failed to send verification email information'),
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

  private async hash(key: string) {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(key, salt);
  }

  private async hashAccountPassword(account: Account) {
    if (account.password === null) return;
    account.password = await this.hash(account.password);
  }

  private formatUsername(account: Account) {
    if (
      !account.profile ||
      !account.profile.firstname ||
      !account.profile.lastname
    )
      return;

    account.profile.lastname = account.profile.lastname.toUpperCase();
    account.profile.firstname =
      account.profile.firstname[0].toUpperCase() +
      account.profile.firstname.slice(1).toLowerCase();
  }
}
