import {
  Controller,
  Logger,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { HasPermissionsGuard } from '@guards/has-permissions.guard';
import { HasPermissions } from '@decorators/has-permissions.decorator';
import { Action, Subject } from '@common/enums/acl';
import { uploadDiskStorage, uploadS3, type } from './multers.options';

const upload = type === 's3' ? uploadS3 : uploadDiskStorage;

@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@Controller('uploads')
export class UploadController {
  private logger: Logger = new Logger(UploadController.name);

  constructor() {}

  @Post()
  @HasPermissions({ action: Action.Create, subject: Subject.All })
  @UseInterceptors(FileInterceptor('file', upload as any))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    this.logger.log('Uploading file');
    if (!file) {
      this.logger.error('No file uploaded');
      return res.status(400).send({ error: 'File not uploaded' });
    }

    return res.send({
      url:
        type === 's3'
          ? (file as any).location
          : file.destination + '/' + file.filename,
    });
  }

  @Post('bulk')
  @HasPermissions({ action: Action.Create, subject: Subject.All })
  @UseInterceptors(FilesInterceptor('files', 5, upload as any))
  uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Res() res: Response,
  ) {
    return res.send({ url: files.map(({ filename }) => filename) });
  }
}
