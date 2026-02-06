import { Services } from '@common';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule.register(), {
    rawBody: true,
  });

  const logger = new Logger('bootstrap');

  // Enhanced Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS SaaS Starter API')
    .setDescription('Production-ready NestJS API with authentication, RBAC, and CRUD base classes')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication & Authorization')
    .addTag('example', 'Example CRUD Module')
    .addTag('admin', 'Admin Operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Get the configured port from the config service
  const configService = app.get(ConfigService);
  const port = configService.get(`${Services.App}.port`) || 3000;
  const corsConfig = configService.get(`${Services.App}.cors`);

  // Enable CORS
  app.enableCors(corsConfig);

  // Security middleware
  // app.use(cookieParser());
  app.use(helmet());

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Trust Nginx proxy headers (X-Forwarded-For, etc.)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger documentation available at: ${await app.getUrl()}/api`);
}

bootstrap();
