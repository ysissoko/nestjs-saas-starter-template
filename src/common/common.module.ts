import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { Services } from './enums/services.enum';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get(`${Services.App}.auth.jwt`) as JwtModuleOptions,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get<TypeOrmModuleOptions>(`${Services.App}.database`),
        autoLoadEntities: true,
      })
    }),
  ],
  providers: [],
  exports: [ConfigModule, JwtModule, TypeOrmModule],
})
export class CommonModule { }
