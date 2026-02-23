import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonModule } from '@common';
import { UploadController } from './upload.controller';
import { VimeoController } from './vimeo.controller';

@Module({
  imports: [CommonModule],
  controllers: [UploadController, VimeoController],
  providers: [ConfigService],
})
export class UploadModule {}
