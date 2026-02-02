import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { configuration } from '@common';
import { Services } from '@common';
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
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Vimeo } from '@vimeo/vimeo';
import { Response } from 'express';
import { existsSync, mkdirSync, PathLike, unlinkSync, writeFileSync } from 'fs';
import { access, mkdir } from 'fs/promises';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { dirname, join } from 'path';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { HasPermissionsGuard } from '@guards/has-permissions.guard';
import { HasPermissions } from '@decorators/has-permissions.decorator';
import { Action, Subject } from '@common/enums/acl';

let upload!: any;

const { endpoint, accessKeyId, secretAccessKey, bucket, type } =
  configuration()[Services.App].storage;
const { clientId, clientSecret, accessToken } =
  configuration()[Services.App].vimeo;

const vimeoClient = new Vimeo(clientId, clientSecret, accessToken);

if (type === 's3') {
  console.log('Using S3 for file uploads');

  const s3Config: S3ClientConfig = {
    endpoint,
    region: 'fra1',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };

  const s3 = new S3Client(s3Config);

  upload = multer({
    storage: multerS3({
      s3,
      bucket,
      acl: 'public-read', // or 'private' if needed
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const filename = `${Date.now()}_${file.originalname}`;
        cb(null, filename);
      },
    }),
  });
} else {
  console.log('Using local disk storage for file uploads');
  upload = {
    storage: multer.diskStorage({
      destination: async (req, _, cb) => {
        const path: PathLike = join(process.cwd(), 'public', 'uploads');
        try {
          await access(path);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_err) {
          await mkdir(path, { recursive: true });
        }
        cb(null, path);
      },
      filename: (req, file, cb) => {
        //Calling the callback passing the name generated with the dish id
        cb(null, `${file.originalname}`);
      },
    }),
  };
}

@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@Controller('uploads')
export class UploadController {
  private logger: Logger = new Logger(UploadController.name);

  constructor() {}

  @Post()
  @HasPermissions({ action: Action.Create, subject: Subject.All })
  @UseInterceptors(
    // I need to add request path on FileInterceptor extractFileName with nestjs
    FileInterceptor('file', { storage: upload.storage } as MulterOptions),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    this.logger.log('Uploading file');
    console.log('File uploaded:', file);
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
  @UseInterceptors(
    FilesInterceptor('files', 5, { storage: upload.storage } as MulterOptions),
  )
  uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Res() res: Response,
  ) {
    return res.send({ url: files.map(({ filename }) => filename) });
  }

  @Post('vimeo')
  @HasPermissions({ action: Action.Create, subject: Subject.File })
  @UseInterceptors(
    // I need to add request path on FileInterceptor extractFileName with nestjs
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
