import { BaseService, Services } from '@common';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { compile } from 'handlebars';
import { join } from 'path';
import { DeepPartial, Repository } from 'typeorm';
import { Account } from '../../auth/modules/account/account.entity';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService extends BaseService<Notification> {
  private readonly logger = new Logger(NotificationService.name);
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {
    super(notificationRepository);
    this.from = this.configService.get<string>(`${Services.App}.mail.from`);
    this.frontendUrl =
      this.configService.get<string>(`${Services.App}.frontend.url`) ||
      'http://localhost:3000';
  }

  public createNotification(
    title: string,
    message: string,
    recipientsIds: number[],
  ): void {
    recipientsIds.forEach((recipientId) => {
      const notification = this.notificationRepository.create({
        title,
        message,
        recipient: { id: recipientId } as Account,
      });

      notification.save();
    });
  }

  public async sendEmail(options: {
    to: string;
    from: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      await this.mailerService.sendMail(options);
      this.logger.log(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
      );
    }
  }

  public loadTemplate(
    templateName: string,
    context: Record<string, any>,
  ): string {
    try {
      const templatePath = join(
        process.cwd(),
        'templates',
        `${templateName}.hbs`,
      );
      const templateContent = readFileSync(templatePath, 'utf8');
      const template = compile(templateContent, { noEscape: true });
      return template({ ...context, frontendUrl: this.frontendUrl });
    } catch (error) {
      this.logger.warn(
        `Template ${templateName} not found, using plain text email`,
      );
      return JSON.stringify(context, null, 2);
    }
  }
}
