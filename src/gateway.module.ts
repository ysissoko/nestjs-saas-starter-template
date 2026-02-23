import { configuration } from '@common';
import { CommonModule } from '@common';
import {
  DynamicModule,
  Module,
  Type,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './modules/upload/upload.module';
import { NotificationModule } from './modules/notification/notification.module';
// IMPORT MODULES - Add your modules here

import { APP_GUARD } from '@nestjs/core';
import { Services } from '@common/enums/services.enum';
import { Account } from './auth/modules/account/account.entity';
import { WebhookController } from '@controllers/webhook.controller';
import { StripeService } from './services/stripe.service';

const SERVICES_REGISTRY: Record<string, Type<any>> = {
  // DO NOT REMOVE: ADD IN REGISTRY
};

@Module({
  imports: [
    CommonModule,
    AuthModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Account,
      // Add your entities here
    ]),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: configService.get(`${Services.App}.mail.transport`),
        defaults: {
          from: configService.get(`${Services.App}.mail.from`),
        },
        template: {
          dir: process.cwd() + '/templates',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>(
              `${Services.App}.throttler.ttl`,
              60000,
            ),
            limit: configService.get<number>(
              `${Services.App}.throttler.limit`,
              300,
            ),
          },
        ],
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    ConfigService,
    // Optional services
    StripeService,
  ],
  exports: [],
})
export class GatewayModule {
  static register(): DynamicModule {
    const controllers: Type<any>[] = Object.values(SERVICES_REGISTRY);
    const moduleImports = [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration],
      }),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const dbConfig = configService.get<TypeOrmModuleOptions>(
            `${Services.App}.database`,
          );
          return {
            ...dbConfig,
            autoLoadEntities: true,
          };
        },
      }),
    ];

    return {
      module: GatewayModule,
      imports: [
        ...moduleImports,
        CommonModule,
        AuthModule,
        UploadModule, // Optional: File upload with S3-compatible storage
        NotificationModule,
      ],
      providers: [
        ConfigService,
        // Optional services (can be removed if not needed)
        StripeService, // Stripe payment integration (optional)
      ],
      exports: [],
      controllers: [
        ...controllers,
        // Optional controllers (can be removed if not needed)
        WebhookController, // Stripe webhook handler (optional)
      ],
    };
  }
}
