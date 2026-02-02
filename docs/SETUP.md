# Setup Guide

Complete guide to setting up the NestJS SaaS Starter template.

## Prerequisites

### Required

- **Node.js**: 20.0.0 or higher
- **pnpm**: 8.0.0 or higher
- **MySQL**: 8.0 or higher (or Docker)

### Optional

- **Docker**: For running MySQL and other services
- **Git**: For version control

### Installation

#### Install Node.js (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### Install pnpm

```bash
npm install -g pnpm
```

#### Install MySQL

**Via Docker (Recommended)**:
```bash
# Already included in docker-compose.yml
docker-compose up -d mysql
```

**Via Package Manager**:
```bash
# Ubuntu/Debian
sudo apt install mysql-server

# macOS
brew install mysql
```

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nestjs-saas-starter.git
cd nestjs-saas-starter
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all dependencies for the monorepo.

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_secure_password  # Change this!
DB_NAME=nestjs_starter

# Auth Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=generated_secret_here
EMAIL_VERIFICATION_SECRET=generated_secret_here
PASSWORD_RESET_SECRET=generated_secret_here

# Email (Example: Gmail)
MAILER_HOST=smtp.gmail.com
MAILER_PORT=587
MAILER_USER=your_email@gmail.com
MAILER_PASS=your_app_password  # Not your regular password!
```

#### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate email verification secret
openssl rand -base64 32

# Generate password reset secret
openssl rand -base64 32
```

#### Gmail Setup

To use Gmail for sending emails:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated password to `MAILER_PASS`

### 4. Start Database

**Via Docker**:
```bash
docker-compose up -d mysql
```

**Via Local MySQL**:
```bash
# Create database
mysql -u root -p
CREATE DATABASE nestjs_starter;
exit
```

### 5. Run Database Migrations

```bash
pnpm db:migrate
```

This creates all necessary tables.

### 6. Seed Initial Data

```bash
pnpm db:seed
```

This creates:
- Default roles (Admin, User)
- Default permissions
- Initial configuration

### 7. Create First Admin User

```bash
pnpm tsx scripts/create-admin.ts
```

Follow the prompts to create your admin account.

### 8. Start Development Server

```bash
pnpm backend:dev
```

The server starts at http://localhost:3000

### 9. Verify Installation

1. **Check API Documentation**:
   Open http://localhost:3000/api

2. **Test Login**:
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your_password"}'
   ```

3. **Test Authenticated Endpoint**:
   ```bash
   curl http://localhost:3000/auth/me \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Configuration Options

### Database Types

The template supports multiple databases. To switch:

1. Update `config/config.yaml`:
   ```yaml
   database:
     type: postgres  # or 'mysql', 'mariadb', 'sqlite'
   ```

2. Install appropriate driver:
   ```bash
   # PostgreSQL
   pnpm add pg

   # MariaDB
   pnpm add mariadb
   ```

3. Update connection details in `.env`

### Optional Features

#### Enable Google OAuth

1. Get credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

2. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```

3. Test:
   ```bash
   # Open in browser
   http://localhost:3000/auth/google
   ```

#### Enable Facebook OAuth

1. Get credentials from [Facebook Developers](https://developers.facebook.com/apps/)

2. Add to `.env`:
   ```env
   FACEBOOK_CLIENT_ID=your_app_id
   FACEBOOK_CLIENT_SECRET=your_app_secret
   FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
   ```

#### Enable S3 File Upload

1. Get AWS credentials or use DigitalOcean Spaces / MinIO

2. Add to `.env`:
   ```env
   STORAGE_ACCESS_KEY_ID=your_access_key
   STORAGE_SECRET_ACCESS_KEY=your_secret_key
   STORAGE_BUCKET=your-bucket-name
   STORAGE_REGION=us-east-1
   STORAGE_ENDPOINT=https://s3.amazonaws.com
   ```

3. Test upload via Swagger UI at http://localhost:3000/api

#### Enable Stripe Payments

1. Get credentials from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

2. Add to `.env`:
   ```env
   STRIPE_API_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. Set up webhook endpoint:
   ```
   https://yourdomain.com/webhook/stripe
   ```

## Development Workflow

### Running in Development

```bash
# Start backend in watch mode
pnpm backend:dev

# Run tests in watch mode
pnpm backend:test:watch

# Lint and format on save (VSCode)
# Install recommended extensions from .vscode/extensions.json
```

### Database Migrations

#### Create New Migration

```bash
# Make changes to your entities
# Then generate migration
pnpm db:migrate:generate MigrationName
```

#### Run Migrations

```bash
pnpm db:migrate
```

#### Revert Migration

```bash
pnpm db:migrate:revert
```

### Generate New Module

```bash
pnpm plop module
# Follow the prompts
```

This creates:
- Entity
- Service
- Controller
- Module
- DTOs
- Tests

## Docker Setup

### Development

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Production

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Troubleshooting

### Database Connection Issues

**Error**: `ECONNREFUSED localhost:3306`

**Solution**:
1. Check if MySQL is running:
   ```bash
   docker-compose ps
   ```
2. Verify credentials in `.env`
3. Ensure database exists:
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"
   ```

### Email Sending Issues

**Error**: `Invalid login: 535 Authentication failed`

**Solution**:
1. For Gmail, use an App Password (not your regular password)
2. Enable "Less secure app access" if not using 2FA
3. Verify SMTP settings in `.env`

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
1. Change port in `.env`:
   ```env
   PORT=3001
   ```
2. Or stop the process using port 3000:
   ```bash
   # Find process
   lsof -i :3000
   # Kill process
   kill -9 PID
   ```

### Migration Failures

**Error**: `Table already exists`

**Solution**:
1. Check migration status:
   ```bash
   # View migrations table
   mysql -u root -p nestjs_starter -e "SELECT * FROM migrations;"
   ```
2. If needed, revert and re-run:
   ```bash
   pnpm db:migrate:revert
   pnpm db:migrate
   ```

### JWT Token Issues

**Error**: `Unauthorized: jwt malformed`

**Solution**:
1. Verify JWT_SECRET is set in `.env`
2. Ensure token format: `Bearer YOUR_TOKEN`
3. Check token hasn't expired (default: 60 minutes)

## Production Deployment

### Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique secrets (min 32 characters)
- [ ] Enable database SSL
- [ ] Set `synchronize: false` in config
- [ ] Run all migrations
- [ ] Configure CORS for your domain
- [ ] Set up HTTPS
- [ ] Enable rate limiting with lower limits
- [ ] Use shorter JWT expiration (15-30 minutes)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Test email sending
- [ ] Verify OAuth callbacks work
- [ ] Test file uploads (if enabled)

### Environment Variables for Production

```env
NODE_ENV=production
DB_SSL=true
JWT_SECRET=very_long_random_secret_min_32_chars
# Use secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
```

### Deployment Platforms

#### AWS EC2 / DigitalOcean Droplet

1. Install Node.js, pnpm, MySQL
2. Clone repository
3. Set up environment variables
4. Build: `pnpm backend:build`
5. Run migrations: `pnpm db:migrate`
6. Start: `pnpm backend:start`
7. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start dist/main.js --name nestjs-api
   pm2 save
   pm2 startup
   ```

#### Docker

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Heroku

```bash
# Install Heroku CLI
# Login and create app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET=your_secret

# Deploy
git push heroku main
```

## Next Steps

1. **Customize branding**: Update app name in `config/config.yaml`
2. **Add your domain entities**: Use `pnpm plop module`
3. **Customize permissions**: Edit `libs/common/src/enums/permissions.enum.ts`
4. **Set up CI/CD**: Configure GitHub Actions
5. **Add monitoring**: Set up error tracking (Sentry, etc.)

## Getting Help

- 📖 [Architecture Documentation](ARCHITECTURE.md)
- 🔐 [Authentication Guide](AUTHENTICATION.md)
- 🛡️ [Authorization Guide](AUTHORIZATION.md)
- 🐛 [Report Issues](https://github.com/yourusername/nestjs-saas-starter/issues)
