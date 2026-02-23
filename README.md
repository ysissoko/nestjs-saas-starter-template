# NestJS SaaS Starter

A production-ready NestJS backend template for building SaaS applications with authentication, authorization, and CRUD base classes that eliminate boilerplate.

## Features

- **🚀 Zero-Boilerplate CRUD** - BaseController and BaseService provide complete CRUD operations out of the box
- **🔐 Complete Authentication** - JWT, OAuth (Google, Facebook), Email verification, Password reset, OTP
- **🛡️ Authorization System** - RBAC (Role-Based Access Control) + CASL for fine-grained permissions
- **⚡ Production-Ready** - Global validation, error handling, rate limiting, security headers
- **📦 Monorepo Structure** - Organized workspace with shared libraries
- **🔧 Configuration System** - YAML config with environment variable overrides
- **📝 API Documentation** - Swagger/OpenAPI with Bearer authentication
- **🐳 Docker Ready** - Docker Compose setup for development and production
- **🧪 Testing Setup** - Unit and E2E test examples
- **🎨 Code Generation** - Plop templates for scaffolding new modules

## Tech Stack

- **Framework**: NestJS 11
- **Database**: TypeORM with MySQL (easily switchable to PostgreSQL)
- **Authentication**: Passport JWT + OAuth strategies
- **Authorization**: CASL (Code Access Security Layer)
- **Validation**: class-validator + class-transformer
- **API Docs**: Swagger/OpenAPI
- **Email**: Nodemailer with Handlebars templates
- **Storage**: S3-compatible (AWS S3, DigitalOcean Spaces, MinIO)
- **Payments**: Stripe integration (optional)
- **Testing**: Vitest
- **Package Manager**: pnpm

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- MySQL 8+ (or Docker)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/yourusername/nestjs-saas-starter.git
   cd nestjs-saas-starter
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start database**
   ```bash
   docker-compose up -d mysql
   ```

4. **Run migrations and seed data**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Create admin user**
   ```bash
   pnpm tsx scripts/create-admin.ts
   ```

6. **Start development server**
   ```bash
   pnpm backend:dev
   ```

7. **Access API documentation**
   Open http://localhost:3000/api in your browser

## Project Structure

```
nestjs-saas-starter/
├── src/
│   ├── auth/                        # Complete auth module (JWT, OAuth, RBAC, CASL)
│   │   ├── guards/                  # Auth guards (JWT, Google, Facebook, Local)
│   │   ├── strategies/              # Passport strategies
│   │   ├── services/                # Auth services (token, OTP, audit-log)
│   │   ├── subscribers/             # TypeORM event subscribers
│   │   ├── decorators/              # Auth decorators (@Public, etc.)
│   │   ├── entities/                # Auth entities (Role, OTP, AuditLog)
│   │   └── modules/
│   │       ├── account/             # Account & profile management
│   │       ├── role/                # Role management
│   │       └── permission/          # CASL permission management
│   ├── common/                      # Shared base classes & utilities
│   │   ├── controller/              # BaseController (8 CRUD endpoints)
│   │   ├── services/                # BaseService (pagination, filtering)
│   │   ├── entity/                  # BaseEntity (timestamps, id)
│   │   ├── config/                  # Configuration system
│   │   ├── dto/                     # Shared DTOs (ACL, Stripe)
│   │   ├── enums/                   # Permissions, actions, subjects
│   │   ├── exceptions/              # Custom exceptions
│   │   └── pagination/              # Pagination utilities
│   ├── controllers/                 # Global controllers (mailer, stripe, webhook)
│   ├── decorators/                  # Custom decorators (@HasPermissions, etc.)
│   ├── guards/                      # Permission guards
│   ├── entities/                    # Domain entities
│   ├── modules/
│   │   ├── notification/            # Notification module
│   │   └── upload/                  # File upload module (S3-compatible)
│   ├── services/                    # Global services (Email, Stripe)
│   ├── database/
│   │   └── seeds/                   # Database seed scripts
│   ├── data-source.ts               # TypeORM data source
│   ├── main.ts                      # Application entry point
│   └── gateway.module.ts            # Root module
├── config/
│   ├── config.yaml                  # Main configuration
│   └── config.example.yaml          # Configuration reference
├── templates/                       # Email templates (Handlebars)
├── plop-templates/                  # Code generator templates
├── scripts/                         # Setup & utility scripts
├── docs/                            # Documentation
├── Dockerfile
└── docker-compose.yml
```

## Available Scripts

### Development
```bash
pnpm backend:dev          # Start backend in watch mode
pnpm backend:build        # Build backend for production
pnpm backend:start        # Start production build
```

### Database
```bash
pnpm db:migrate           # Run migrations
pnpm db:migrate:revert    # Revert last migration
pnpm db:migrate:generate  # Generate migration from entities
pnpm db:seed              # Seed database with initial data
```

### Testing
```bash
pnpm backend:test         # Run unit tests
pnpm backend:test:watch   # Run tests in watch mode
pnpm backend:test:cov     # Run tests with coverage
```

### Code Quality
```bash
pnpm lint                 # Lint all packages
pnpm format               # Format code with Prettier
pnpm typecheck            # Type check without emitting
```

### Module Generation
```bash
pnpm plop module          # Generate new CRUD module
```

## Base Classes Usage

### Create a New Module

1. **Generate scaffolding**
   ```bash
   pnpm plop module
   # Enter module name: Task
   ```

2. **Your new module includes:**
   - Entity with BaseEntity
   - Service with BaseService
   - Controller with BaseController
   - Module registration
   - DTOs with validation
   - Full Swagger documentation

3. **8 CRUD endpoints out of the box:**
   - `POST /tasks/all` - Get items with filters
   - `POST /tasks/paginate` - Paginated search
   - `POST /tasks/query` - Query single item
   - `GET /tasks/list` - List all
   - `GET /tasks/:id` - Get by ID
   - `POST /tasks` - Create
   - `PATCH /tasks/:id` - Update
   - `DELETE /tasks/:id` - Delete

### Example Controller

```typescript
@Controller('tasks')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class TaskController extends BaseController<Task> {
  protected ownerRelations = ['account'];

  constructor(private readonly taskService: TaskService) {
    super(taskService);
  }

  // All CRUD endpoints inherited from BaseController
  // Add custom endpoints as needed

  @Get('my-tasks')
  @HasPermissions({ action: Action.Read, subject: 'Task' })
  async getMyTasks(@Request() req) {
    return this.taskService.findByAccountId(req.user.id);
  }
}
```

## Environment Variables

Required variables (see `.env.example` for complete list):

```env
# Database
DB_PASSWORD=your_secure_password
DB_NAME=nestjs_starter

# Auth Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret
EMAIL_VERIFICATION_SECRET=your_email_secret
PASSWORD_RESET_SECRET=your_reset_secret

# Email
MAILER_USER=your_email@gmail.com
MAILER_PASS=your_app_password
```

## Authentication Flows

### 1. Email/Password Login
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### 2. Google OAuth
```bash
GET /auth/google           # Redirect to Google
GET /auth/google/callback  # Callback URL
```

### 3. Email Verification
```bash
POST /auth/verify
{
  "token": "verification_token"
}
```

See [AUTHENTICATION.md](docs/AUTHENTICATION.md) for detailed flows.

## Authorization

### Permissions System

The template uses CASL for flexible, attribute-based access control:

```typescript
// Define what user can do
@HasPermissions({ action: Action.Read, subject: 'Task' })
async getTasks() { ... }

// Check resource ownership
@HasPermissions({ action: Action.Update, subject: 'Task' })
async updateTask(@Param('id') id: string) {
  // HasPermissionsGuard automatically checks if user owns the task
}
```

See [AUTHORIZATION.md](docs/AUTHORIZATION.md) for details.

## Deployment

### Docker Production Build

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Build the application:
   ```bash
   pnpm backend:build
   ```

2. Set environment variables in production

3. Run migrations:
   ```bash
   pnpm db:migrate
   ```

4. Start the server:
   ```bash
   pnpm backend:start
   ```

## Optional Features

### Removing Features You Don't Need

**Remove OAuth:**
- Delete OAuth strategies from `apps/backend/src/auth/strategies/`
- Remove OAuth guards from `apps/backend/src/auth/guards/`
- Remove OAuth config from `config/config.yaml`

**Remove Stripe:**
- Delete `apps/backend/src/services/stripe.service.ts`
- Delete `apps/backend/src/controllers/webhook.controller.ts`
- Remove Stripe config from `config/config.yaml`

**Remove File Upload:**
- Delete `apps/backend/src/modules/upload/`
- Remove UploadModule from `gateway.module.ts`
- Remove storage config from `config/config.yaml`

## Documentation

- [SETUP.md](docs/SETUP.md) - Detailed setup guide
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [AUTHENTICATION.md](docs/AUTHENTICATION.md) - Auth flows & strategies
- [AUTHORIZATION.md](docs/AUTHORIZATION.md) - RBAC & CASL permissions

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](docs/)
- 🐛 [Report Issues](https://github.com/yourusername/nestjs-saas-starter/issues)
- 💬 [Discussions](https://github.com/yourusername/nestjs-saas-starter/discussions)

## What's Included vs What You Build

### ✅ Included (Never write again)
- Complete authentication system
- Authorization with RBAC & CASL
- Base CRUD operations
- API documentation setup
- Error handling & validation
- Rate limiting & security
- Email templates & sending
- File upload to S3
- Database migrations
- Docker setup

### 🎨 What You Focus On
- Your business logic
- Custom endpoints
- Domain entities
- Business rules
- UI/UX

## Credits

Created to eliminate 40-60 hours of boilerplate setup for every new project.

---

**Star this repo** if you find it useful! ⭐
