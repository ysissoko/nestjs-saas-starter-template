import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonModule } from '@common';
import { UploadController } from './upload.controller';

@Module({
  imports: [CommonModule],
  controllers: [UploadController],
  providers: [ConfigService],
})
export class UploadModule {}
