export interface DatabaseConfig {
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  entities: string[];
}

export interface JwtConfig {
  secret: string;
  signOptions: {
    expiresIn: string;
    issuer: string;
  };
}

export interface TokenConfig {
  expiresIn: string;
  secret: string;
}

export interface AuthConfig {
  otp: {
    enabled: boolean;
    template: string;
    expiry: string;
  };
  verificationEmail: {
    token: TokenConfig;
    template: string;
  };
  resetPasswordEmail: {
    token: TokenConfig;
    template: string;
  };
  jwt: JwtConfig;
  passport: {
    defaultStrategy: string;
  };
}

export interface StorageConfig {
  type: string;
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface VimeoConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
}

export interface CorsConfig {
  origin: string[];
  methods: string;
  allowedHeaders: string;
  credentials: boolean;
}

export interface ApiGatewayConfig {
  host: string;
  port: number;
  typeorm: DatabaseConfig;
  mail: {
    from: string;
  };
  frontend: {
    url: string;
  };
  auth: AuthConfig;
  storage: StorageConfig;
  vimeo: VimeoConfig;
  cors: CorsConfig;
}

export interface MailerTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface MailerServiceConfig {
  host: string;
  port: number;
  options: {
    transport: MailerTransportConfig;
  };
  enabled: boolean;
}

export interface StripeServiceConfig {
  enabled: boolean;
  host: string;
  port: number;
  apiKey: string;
  apiVersion: string;
  webhook: {
    secret: string;
  };
}

export interface AppConfig {
  'api-gateway': ApiGatewayConfig;
  'mailer-service': MailerServiceConfig;
  'stripe-service': StripeServiceConfig;
}
