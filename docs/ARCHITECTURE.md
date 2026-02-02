# Architecture Documentation

## System Overview

The NestJS SaaS Starter is built on a modular, layered architecture that prioritizes code reuse, type safety, and security.

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│  (Swagger, CORS, Rate Limiting, Validation, Security)   │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼──────┐  ┌───────▼────────┐
│  Auth Module   │ │   Example   │  │  Your Modules  │
│  (JWT, OAuth)  │ │   Module    │  │                │
└───────┬────────┘ └──────┬──────┘  └───────┬────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼────────┐                   ┌───────▼────────┐
│  Common Module │                   │   TypeORM      │
│  (Base Classes)│                   │   (Database)   │
└────────────────┘                   └────────────────┘
```

## Architecture Layers

### 1. API Gateway Layer

**Location**: `apps/backend/src/main.ts`, `gateway.module.ts`

**Responsibilities**:
- HTTP server setup
- Global middleware (CORS, helmet, cookies)
- Global pipes (validation)
- Global guards (authentication, rate limiting)
- Swagger documentation
- Module registration

**Key Files**:
- `main.ts` - Bootstrap application
- `gateway.module.ts` - Root module with dynamic imports

### 2. Module Layer

**Pattern**: Feature-based modules

Each module follows this structure:
```
module-name/
├── entities/           # Database entities
├── dto/               # Data Transfer Objects
├── module-name.service.ts
├── module-name.controller.ts
└── module-name.module.ts
```

**Example**: Auth Module (`apps/backend/src/auth/`)
```
auth/
├── entities/          # Account, Role, Permission, OTP
├── strategies/        # JWT, Local, Google, Facebook
├── guards/            # Auth guards
├── services/          # Token, OTP services
├── account/           # Account management
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts
```

### 3. Common Layer

**Location**: `libs/common/src/`

**Purpose**: Shared code across all modules

**Components**:
- **Base Classes**: Reduce boilerplate
  - `BaseEntity` - Auto-generated ID, timestamps, owner ID
  - `BaseService` - CRUD operations, pagination
  - `BaseController` - 8 REST endpoints
- **Configuration**: YAML + environment variables
- **Enums**: Permissions, actions, subjects
- **DTOs**: Shared data transfer objects
- **Exceptions**: Custom error classes
- **Utilities**: Pagination, filters

### 4. Data Layer

**ORM**: TypeORM

**Pattern**: Repository pattern via BaseService

**Database Schema**:
```
┌─────────────┐
│  accounts   │──┐
└─────────────┘  │
                 │
┌─────────────┐  │    ┌─────────────┐
│    roles    │──┼────│   account   │
└─────────────┘  │    │   _roles    │
                 │    └─────────────┘
┌─────────────┐  │
│ permissions │──┘
└─────────────┘

┌─────────────┐       ┌─────────────┐
│  examples   │───────│  accounts   │
└─────────────┘       └─────────────┘
  (your entities)      (ownership)
```

## Base Classes Hierarchy

### BaseEntity

```typescript
TypeormBaseEntity
├── id: UUID (auto-generated)
├── createdAt: Date (auto)
├── updatedAt: Date (auto)
└── ownerId: string (virtual, for CASL)

Your Entity extends TypeormBaseEntity
├── inherits: id, timestamps
├── adds: domain-specific fields
└── implements: ownerId getter
```

### BaseService

```typescript
BaseService<T>
├── repository: Repository<T>
├── paginate(options) → Pagination<T>
├── all(options) → T[]
├── find(filter) → T[]
├── findOne(filter) → T
├── create(entity) → T
├── update(id, entity) → UpdateResult
├── findById(id, relations) → T
├── destroy(id) → DeleteResult
└── count(where) → number

Your Service extends BaseService<YourEntity>
├── inherits: all CRUD methods
└── adds: custom business logic
```

### BaseController

```typescript
BaseController<T>
├── service: BaseService<T>
├── POST   /all       → getAll()
├── POST   /paginate  → searchItems()
├── POST   /query     → queryItem()
├── GET    /list      → listAllItems()
├── GET    /:id       → getItemById()
├── POST   /          → createItem()
├── PATCH  /:id       → updateItem()
└── DELETE /:id       → deleteItem()

Your Controller extends BaseController<YourEntity>
├── inherits: 8 CRUD endpoints
├── adds: custom endpoints
└── configures: ownerRelations for CASL
```

## Authentication Flow

### JWT Authentication

```
1. User Login
   POST /auth/login
   { email, password }
         │
         ▼
   LocalStrategy validates
         │
         ▼
   JWT token generated
   { access_token: "..." }

2. Authenticated Request
   GET /api/resource
   Header: Authorization: Bearer <token>
         │
         ▼
   JwtAuthGuard extracts token
         │
         ▼
   JwtStrategy validates & decodes
         │
         ▼
   User attached to request
   req.user = { id, email, roles, ... }
```

### OAuth Flow (Google/Facebook)

```
1. Initiate OAuth
   GET /auth/google
         │
         ▼
   Redirect to Google
         │
         ▼
   User authorizes
         │
         ▼
   GET /auth/google/callback?code=...
         │
         ▼
   GoogleStrategy validates
         │
         ▼
   Find or create account
         │
         ▼
   JWT token generated
   Redirect with token
```

## Authorization Flow

### RBAC (Role-Based Access Control)

```
Account
  └── roles[] (many-to-many)
        └── permissions[] (many-to-many)

Permission = { action: "read", subject: "Example" }

HasPermissionsGuard checks:
1. User has required permission
2. User owns the resource (if applicable)
```

### CASL Permission Checks

```
@HasPermissions({ action: Action.Update, subject: "Example" })
async updateExample(@Param('id') id: string) {
         │
         ▼
   HasPermissionsGuard
         │
         ├── Check: User has "Update" permission on "Example"
         │
         ├── Fetch resource with ownerRelations
         │
         ├── Check: User owns resource (resource.ownerId === user.id)
         │     OR User has "Manage" permission
         │
         └── Allow/Deny
}
```

## Request Lifecycle

```
HTTP Request
      │
      ▼
1. CORS Middleware
      │
      ▼
2. Helmet (Security Headers)
      │
      ▼
3. Cookie Parser
      │
      ▼
4. Body Parser
      │
      ▼
5. ThrottlerGuard (Rate Limiting)
      │
      ▼
6. JwtAuthGuard (Authentication)
      │
      ├── No token → 401 Unauthorized
      └── Valid token → Attach user to request
      │
      ▼
7. HasPermissionsGuard (Authorization)
      │
      ├── No permission → 403 Forbidden
      └── Has permission → Continue
      │
      ▼
8. ValidationPipe (DTO Validation)
      │
      ├── Invalid data → 400 Bad Request
      └── Valid data → Transform & continue
      │
      ▼
9. Controller Handler
      │
      ▼
10. Service Layer
      │
      ▼
11. Repository (TypeORM)
      │
      ▼
12. Database
      │
      ▼
Response (JSON)
```

## Configuration System

### Layered Configuration

```
1. Base Config (config/config.yaml)
   ↓
2. Environment Overrides (.env)
   ↓
3. Runtime Access (ConfigService)
```

### Example

**config.yaml**:
```yaml
app:
  database:
    password: # Empty, must be provided
```

**.env**:
```env
DB_PASSWORD=secure_password
```

**Code**:
```typescript
configuration.ts loads YAML
   ↓
Checks for DB_PASSWORD env var
   ↓
Overrides config.app.database.password
   ↓
ConfigService provides final config
```

## Module Registration

### Dynamic Module Pattern

```typescript
@Module({})
export class GatewayModule {
  static register(): DynamicModule {
    return {
      module: GatewayModule,
      imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRootAsync(),
        AuthModule,
        ExampleModule,
        // Your modules...
      ],
      // ...
    };
  }
}
```

### Module Dependencies

```
GatewayModule (Root)
├── ConfigModule (@Global)
├── TypeOrmModule (@Global)
├── CommonModule (@Global)
│   ├── ConfigModule
│   ├── JwtModule
│   └── TypeOrmModule
├── AuthModule (@Global)
│   ├── CommonModule
│   ├── PassportModule
│   └── AccountModule
└── Feature Modules
    ├── ExampleModule
    └── Your Modules
```

## Database Patterns

### Entity Relationships

```typescript
// One-to-Many (Account → Examples)
@Entity()
class Account {
  @OneToMany(() => Example, example => example.account)
  examples: Example[];
}

@Entity()
class Example {
  @ManyToOne(() => Account, account => account.examples)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  accountId: string;
}
```

### Migration Strategy

```
1. Development:
   - Modify entities
   - Generate migration: pnpm db:migrate:generate
   - Review migration file
   - Run migration: pnpm db:migrate

2. Production:
   - NEVER use synchronize: true
   - Always use migrations
   - Test migrations on staging first
   - Run with transaction support
   - Keep rollback scripts ready
```

## Security Architecture

### Defense in Depth

```
Layer 1: Network (CORS, Helmet, Rate Limiting)
Layer 2: Authentication (JWT, OAuth)
Layer 3: Authorization (RBAC, CASL)
Layer 4: Validation (class-validator)
Layer 5: Database (Parameterized queries via TypeORM)
```

### Secret Management

```
Development:
  .env file (not committed)

Production:
  Environment variables
  OR
  Secrets Manager (AWS Secrets Manager, Vault, etc.)
```

## Performance Considerations

### Database Optimization

- **Indexes**: Add to frequently queried fields
- **Relations**: Lazy load by default, eager load when needed
- **Pagination**: Always paginate large datasets
- **Caching**: Consider Redis for frequently accessed data

### API Optimization

- **Rate Limiting**: Prevent abuse
- **Compression**: Enable gzip
- **CDN**: Serve static files from CDN
- **Async Operations**: Use queues for long-running tasks

## Testing Strategy

```
Unit Tests (services, guards)
  ↓
Integration Tests (modules)
  ↓
E2E Tests (full API flows)
```

## Extensibility Points

### Adding New Modules

1. Generate: `pnpm plop module`
2. Implement business logic
3. Register in `gateway.module.ts`

### Custom Guards

```typescript
@Injectable()
export class CustomGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    // Your logic
  }
}
```

### Custom Decorators

```typescript
export const CustomDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // Your logic
  },
);
```

## Deployment Architecture

### Single Server

```
├── Nginx (Reverse Proxy)
│   ├── SSL Termination
│   └── Static Files
├── NestJS API (PM2)
└── MySQL
```

### Microservices (Future)

```
API Gateway
  ├── Auth Service
  ├── User Service
  └── Your Services
```

## Best Practices

1. **Always extend base classes** - Don't reinvent CRUD
2. **Use DTOs** - Never expose entities directly
3. **Validate input** - Use class-validator decorators
4. **Check permissions** - Use @HasPermissions on all endpoints
5. **Handle errors** - Use try/catch and proper HTTP status codes
6. **Log appropriately** - Use NestJS Logger
7. **Test thoroughly** - Unit + E2E tests
8. **Document APIs** - Use Swagger decorators
9. **Keep secrets secret** - Never commit .env
10. **Migrate, don't sync** - Use migrations in production

## Further Reading

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [CASL Documentation](https://casl.js.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
