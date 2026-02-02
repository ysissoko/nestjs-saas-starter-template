import { AccountService, RequestOtpType } from '@auth/modules/account/account.service';
import { AuthService } from '@auth/auth.service';
import { FacebookAuthGuard } from '@auth/guards/facebook-auth.guard';
import { GoogleAuthGuard } from '@auth/guards/google-auth.guard';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '@auth/guards/local-auth.guard';
import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private accountService: AccountService,
    private stripeService: StripeService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // max 5 requests per 60s
  @UseGuards(LocalAuthGuard)
  login(@Req() req: any, @Res() res: Response) {
    // Classic login - don't redirect, return JSON response
    this.authService.login(res, req.user as any, false);
  }

  @Get('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res() res: Response) {
    this.authService.logout(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user }) {
    return this.authService.me((req.user as any).email);
  }

  @SkipThrottle()
  @Get('authenticated')
  authenticated(@Req() req: Request) {
    return this.authService.isAuthenticated(req);
  }

  @Post('verify')
  verifyAccount(
    @Headers('x-auth-token') token: string,
    @Body('otp') otp?: string | undefined,
  ) {
    return this.accountService.verifyAccount(token, otp);
  }

  @Get('resend-otp')
  requestOtp(
    @Headers('x-auth-token') token: string,
    @Query('requestType') requestType: RequestOtpType,
  ) {
    return this.accountService.requestOtp(token, requestType);
  }

  @Get('resend-verification-email')
  resendVerificationEmail(@Query('email') email: string) {
    return this.accountService.resendVerificationEmail(email);
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.accountService.forgotPassword(email);
  }

  @Patch('reset-password')
  resetPassword(
    @Headers('x-auth-token') token: string,
    @Body('password') password: string,
  ) {
    return this.accountService.resetPassword(token, password);
  }

  @Get('token-info')
  getTokenInfo(
    @Headers('x-auth-token') token: string,
    @Query('requestType') requestType: RequestOtpType,
  ) {
    return this.accountService.getTokenInfo(token, requestType);
  }

  @Get('me/subscription')
  @UseGuards(JwtAuthGuard)
  async getAuthenticatedUserPlan(@Req() req: Request) {
    const { id: userId } = req.user as any;
    // Get the stripe customer ID from the user object
    if (!userId) {
      throw new Error('User ID is required to get the subscription plan.');
    }

    const customerId = await this.accountService.getUserStripeCustomerId(
      userId,
    );
    if (!customerId) {
      return { data: null };
    }

    return this.stripeService.getCustomerActiveSubscription(customerId);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Initiates the Google OAuth flow
    // The guard will redirect to Google's consent page
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthCallback(@Req() req: any, @Res() res: Response) {
    // Handle successful authentication - redirect to frontend
    this.authService.login(res, req.user as any, true);
  }

  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  facebookAuth() {
    // Initiates the Facebook OAuth flow
    // The guard will redirect to Facebook's consent page
  }

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  facebookAuthCallback(@Req() req: any, @Res() res: Response) {
    // Handle successful authentication - redirect to frontend
    this.authService.login(res, req.user as any, true);
  }
}
