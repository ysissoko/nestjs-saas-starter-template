import { configuration } from '@common';
import { Services } from '@common';
import {
  Controller,
  Logger,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Vimeo } from '@vimeo/vimeo';
import { Response } from 'express';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { HasPermissionsGuard } from '@guards/has-permissions.guard';
import { HasPermissions } from '@decorators/has-permissions.decorator';
import { Action, Subject } from '@common/enums/acl';
import multer from 'multer';

const { clientId, clientSecret, accessToken } =
  configuration()[Services.App].vimeo ?? { clientId: -1, clientSecret: '', accessToken: ''};

const vimeoClient = new Vimeo(clientId, clientSecret, accessToken);

@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@Controller('uploads')
export class VimeoController {
  private logger: Logger = new Logger(VimeoController.name);

  constructor() {}

  @Post('vimeo')
  @HasPermissions({ action: Action.Create, subject: Subject.File })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
      },
      fileFilter: (req, file, cb) => {
        // Accept video files only
        if (file.mimetype.startsWith('video/')) {
          cb(null, true);
        } else {
          cb(new Error('Only video files are allowed!'), false);
        }
      },
    } as MulterOptions),
  )
  uploadToVimeo(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    // Prepare temporary file path
    const tempFilePath = join(
      __dirname,
      'temp',
      `temp_${Date.now()}_${file.originalname}`,
    );
    const tempDir = dirname(tempFilePath);

    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // write the file in a temporary file
    writeFileSync(tempFilePath, new Uint8Array(file.buffer));

    vimeoClient.upload(
      tempFilePath,
      {
        name: 'Uploaded Video',
        description: 'Uploaded via buffer',
        'upload.size': file.size,
        'upload.approach': 'tus', // Optional: default is 'tus'
      },
      (uri) => {
        vimeoClient.request(uri + '?fields=link', (error, body) => {
          if (error) return res.status(500).send('Error getting Vimeo link.');

          unlinkSync(tempFilePath);
          res.json({ url: body.link });
        });
      },
      (bytesUploaded, bytesTotal) => {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(`${percentage}% uploaded`);
      },
      (error) => {
        res.status(500).send(`Upload failed: ${error}`);
      },
    );
  }
}
