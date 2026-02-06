import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { CommonModule } from '@common';
import { Services } from '@common';
import { StripeService } from '../services/stripe.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { AccountModule } from './modules/account/account.module';
import { HasPermissionsGuard } from '../guards/has-permissions.guard';

@Global()
@Module({
  imports: [
    CommonModule,
    PassportModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get(`${Services.App}.auth.passport`),
    }),
    AccountModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    FacebookStrategy,
    ConfigService,
    StripeService,
    AuthService,
    JwtAuthGuard,
    LocalAuthGuard,
    GoogleAuthGuard,
    FacebookAuthGuard,
    HasPermissionsGuard,
  ],
  exports: [AccountModule, HasPermissionsGuard],
})
export class AuthModule {}
