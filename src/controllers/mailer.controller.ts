import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('mailer')
export class MailerController {
  private logger = new Logger(MailerController.name);

  constructor(
    private readonly mailerService: MailerService,
  ) {}

  @Post('send')
  sendMail(@Body() dto: ISendMailOptions) {
    return this.mailerService.sendMail(dto);
  }
}
