import { Services } from '@common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { compile } from 'handlebars';
import { SentMessageInfo } from 'nodemailer';
import { join } from 'path';
import { Observable, from } from 'rxjs';

type ISendOtpEmailOptions = {
  email: string;
  otp: string;
  token?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly frontendUrl: string;
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.from = this.configService.get<string>(`${Services.App}.mail.from`);
    this.frontendUrl = this.configService.get<string>(
      `${Services.App}.frontend.url`,
    );
  }

  send(dto: ISendMailOptions): Observable<SentMessageInfo> {
    return from(this.mailerService.sendMail(dto));
  }

  private generateOtpEmail(data: {
    otp: string;
    token?: string;
    email?: string;
  }): string {
    const templatePath =
      this.configService.get<string>(`${Services.App}.auth.otp.template`) ||
      'templates/otp.hbs';
    const fullPath = join(process.cwd(), templatePath);
    const templateContent = readFileSync(fullPath, 'utf8');
    const templateOtpCode = compile(templateContent, { noEscape: true });
    const emailOtpCodeHtml = templateOtpCode({
      ...data,
      frontendUrl: this.frontendUrl,
    });
    return emailOtpCodeHtml;
  }

  private generateVerificationEmail(data: {
    token: string;
    otp?: string;
    email: string;
  }): string {
    const templatePath =
      this.configService.get<string>(
        `${Services.App}.auth.verificationEmail.template`,
      ) || 'templates/verification-email.hbs';
    const fullPath = join(process.cwd(), templatePath);
    const templateContent = readFileSync(fullPath, 'utf8');
    const templateVerificationEmail = compile(templateContent, {
      noEscape: true,
    });

    const emailVerificationHtml = templateVerificationEmail({
      ...data,
      frontendUrl: this.frontendUrl,
    });
    return emailVerificationHtml;
  }

  private generateResetPasswordEmail(data: {
    token: string;
    otp?: string;
    email: string;
  }): string {
    const templatePath =
      this.configService.get<string>(
        `${Services.App}.auth.resetPasswordEmail.template`,
      ) || 'templates/reset-password.hbs';
    const fullPath = join(process.cwd(), templatePath);
    const templateContent = readFileSync(fullPath, 'utf8');
    const templateResetPassword = compile(templateContent, { noEscape: true });
    const emailResetPasswordHtml = templateResetPassword({
      ...data,
      frontendUrl: this.frontendUrl,
    });
    return emailResetPasswordHtml;
  }

  sendOtpEmail(dto: ISendOtpEmailOptions): Observable<SentMessageInfo> {
    const { email: to, otp, token } = dto;
    return this.send({
      to,
      subject: 'Your OTP code',
      html: this.generateOtpEmail({ otp, token, email: to }),
      from: this.from,
    });
  }

  sendVerificationEmail(
    dto: ISendOtpEmailOptions,
  ): Observable<SentMessageInfo> {
    const { email: to, otp, token } = dto;
    return this.send({
      to,
      subject: 'Verify your email',
      html: this.generateVerificationEmail({ token, otp, email: to }),
      from: this.from,
    });
  }

  sendResetPasswordEmail(
    dto: ISendOtpEmailOptions,
  ): Observable<SentMessageInfo> {
    const { email: to, otp, token } = dto;
    return this.send({
      to,
      subject: 'Reset your password',
      html: this.generateResetPasswordEmail({ token, otp, email: to }),
      from: this.from,
    });
  }
}
