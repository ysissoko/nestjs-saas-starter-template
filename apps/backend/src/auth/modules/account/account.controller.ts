import { BaseController } from '@common';
import { ID } from '@common';
import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { Account } from '@auth/modules/account/account.entity';
import { Profile } from '@auth/modules/account/profile.entity';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { HasPermissionsGuard } from '@guards/has-permissions.guard';
import { HasPermissions } from '@decorators/has-permissions.decorator';
import { Public } from '@auth/decorators/public.decorator';
import { Action, Subject } from '@common';
import { AccountService } from './account.service';

@Controller('accounts')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
export class AccountController extends BaseController<Account> {
  constructor(private readonly accountService: AccountService) {
    super(accountService);
  }

  @Public()
  @Post()
  async create(@Body() dto: Account) {
    try {
      const result = await this.accountService.create(dto);
      // Remove sensitive fields before returning

      const {
        password,
        loginAttempts,
        emailVerificationToken,
        resetPasswordToken,
        otp,
        accountState,
        ...account
      } = result;
      return account;
    } catch (error) {
      // Check if it's a duplicate email error
      // PostgreSQL: error.code === '23505'
      // MySQL: error.code === 'ER_DUP_ENTRY' or error.errno === 1062
      const isDuplicateError =
        error.code === '23505' ||
        error.code === 'ER_DUP_ENTRY' ||
        error.errno === 1062 ||
        (error.message && error.message.includes('duplicate') && error.message.includes('email'));

      if (isDuplicateError) {
        throw new BadRequestException('This email address is already registered. Please use a different email or log in to your existing account.');
      }
      // Re-throw other errors
      throw error;
    }
  }

  @Patch(':accountId/role')
  @HasPermissions({ action: Action.Update, subject: Subject.Account })
  updateRole(
    @Param('accountId') accountId: number,
    @Body('roleId') roleId: ID,
    @Req() request: Request,
  ) {
    const actor = (request as any).user;
    const ipAddress = request.ip || request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.accountService.updateRole(accountId, roleId, actor, ipAddress, userAgent);
  }

  @Patch(':accountId/profile')
  @HasPermissions({ action: Action.Update, subject: Subject.Profile })
  async updateProfile(
    @Param('accountId') accountId: number,
    @Body() dto: Partial<Profile>,
  ) {
    return this.accountService.updateProfile(accountId, dto);
  }
}
