import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { Services } from '../enums/services.enum';

const YAML_CONFIG_FILENAME = 'config.yaml';

export default () => {
  // Load environment variables if not in production
  if (process.env.NODE_ENV !== 'production') {
    try {
      require('dotenv').config();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // dotenv is optional, continue without it
    }
  }

  const config = yaml.load(
    readFileSync(join(process.cwd(), 'config', YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, any>;

  // Override secrets with environment variables if available
  if (config[Services.App]) {
    // Database password
    if (process.env.DB_PASSWORD) {
      config[Services.App].database.password = process.env.DB_PASSWORD;
    }

    // JWT and auth secrets
    if (process.env.JWT_SECRET) {
      config[Services.App].auth.jwt.secret = process.env.JWT_SECRET;
    }
    if (process.env.EMAIL_VERIFICATION_SECRET) {
      config[Services.App].auth.verificationEmail.token.secret =
        process.env.EMAIL_VERIFICATION_SECRET;
    }
    if (process.env.PASSWORD_RESET_SECRET) {
      config[Services.App].auth.resetPasswordEmail.token.secret =
        process.env.PASSWORD_RESET_SECRET;
    }

    // Storage credentials
    if (process.env.STORAGE_ACCESS_KEY_ID) {
      config[Services.App].storage.accessKeyId =
        process.env.STORAGE_ACCESS_KEY_ID;
    }
    if (process.env.STORAGE_SECRET_ACCESS_KEY) {
      config[Services.App].storage.secretAccessKey =
        process.env.STORAGE_SECRET_ACCESS_KEY;
    }
    if (process.env.STORAGE_BUCKET) {
      config[Services.App].storage.bucket = process.env.STORAGE_BUCKET;
    }

    // Vimeo credentials
    if (process.env.VIMEO_CLIENT_ID) {
      config[Services.App].vimeo.clientId = process.env.VIMEO_CLIENT_ID;
    }
    if (process.env.VIMEO_CLIENT_SECRET) {
      config[Services.App].vimeo.clientSecret =
        process.env.VIMEO_CLIENT_SECRET;
    }
    if (process.env.VIMEO_ACCESS_TOKEN) {
      config[Services.App].vimeo.accessToken =
        process.env.VIMEO_ACCESS_TOKEN;
    }

    // Mailer credentials for gateway
    if (process.env.MAILER_USER && config[Services.App]?.mail) {
      config[Services.App].mail.transport.auth.user =
        process.env.MAILER_USER;
    }
    if (process.env.MAILER_PASS && config[Services.App]?.mail) {
      config[Services.App].mail.transport.auth.pass =
        process.env.MAILER_PASS;
    }

    // Global rate limiting
    if (process.env.RATE_LIMIT) {
      const limit = parseInt(process.env.RATE_LIMIT, 10);
      if (!isNaN(limit) && config[Services.App]?.throttler) {
        config[Services.App].throttler.limit = limit;
      }
    }

    if (process.env.RATE_LIMIT_TTL) {
      const ttl = parseInt(process.env.RATE_LIMIT_TTL, 10);
      if (!isNaN(ttl) && config[Services.App]?.throttler) {
        config[Services.App].throttler.ttl = ttl;
      }
    }

    // GOOGLE
    if (process.env.GOOGLE_CLIENT_ID) {
      config[Services.App].auth.google.clientID =
        process.env.GOOGLE_CLIENT_ID;
    }

    if (process.env.GOOGLE_CLIENT_SECRET) {
      config[Services.App].auth.google.clientSecret =
        process.env.GOOGLE_CLIENT_SECRET;
    }

    if (process.env.GOOGLE_CALLBACK_URL) {
      config[Services.App].auth.google.callbackURL =
        process.env.GOOGLE_CALLBACK_URL;
    }

    // Facebook
    if (process.env.FACEBOOK_CLIENT_ID) {
      config[Services.App].auth.facebook.clientID =
        process.env.FACEBOOK_CLIENT_ID;
    }

    if (process.env.FACEBOOK_CLIENT_SECRET) {
      config[Services.App].auth.facebook.clientSecret =
        process.env.FACEBOOK_CLIENT_SECRET;
    }

    if (process.env.FACEBOOK_CALLBACK_URL) {
      config[Services.App].auth.facebook.callbackURL =
        process.env.FACEBOOK_CALLBACK_URL;
    }

    // Global rate limiting
    if (process.env.RATE_LIMIT) {
      const limit = parseInt(process.env.RATE_LIMIT, 10);
      if (!isNaN(limit) && config['api-gateway']?.throttler) {
        config['api-gateway'].throttler.limit = limit;
      }
    }

    if (process.env.RATE_LIMIT_TTL) {
      const ttl = parseInt(process.env.RATE_LIMIT_TTL, 10);
      if (!isNaN(ttl) && config['api-gateway']?.throttler) {
        config['api-gateway'].throttler.ttl = ttl;
      }
    }
  }

  // Stripe credentials (now integrated into app config)
  if (config[Services.App]?.stripe && process.env.STRIPE_API_KEY) {
    config[Services.App].stripe.apiKey = process.env.STRIPE_API_KEY;
  }
  if (config[Services.App]?.stripe && process.env.STRIPE_WEBHOOK_SECRET) {
    config[Services.App].stripe.webhook.secret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  return config;
};
