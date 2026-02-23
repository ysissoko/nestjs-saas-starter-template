import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { configuration } from '@common';
import { Services } from '@common';
import { PathLike } from 'fs';
import { access, mkdir } from 'fs/promises';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { join } from 'path';

const { endpoint, accessKeyId, secretAccessKey, type, bucket } =
  configuration()[Services.App].storage;

const s3Config: S3ClientConfig = {
  endpoint,
  region: 'fra1',
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
};

const s3 = new S3Client(s3Config);

const uploadS3 = multer({
  storage: multerS3({
    s3,
    bucket,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const filename = `${Date.now()}_${file.originalname}`;
      cb(null, filename);
    },
  }),
});

const uploadDiskStorage = multer({
  storage: multer.diskStorage({
    destination: async (req, _, cb) => {
      const path: PathLike = join(process.cwd(), 'public', 'uploads');
      try {
        await access(path);
      } catch (_err) {
        await mkdir(path, { recursive: true });
      }
      cb(null, path);
    },
    filename: (req, file, cb) => {
      cb(null, `${file.originalname}`);
    },
  }),
});

export { uploadS3, type, uploadDiskStorage };
