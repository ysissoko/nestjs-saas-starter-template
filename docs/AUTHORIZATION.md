# Authorization Guide

Complete guide to Role-Based Access Control (RBAC) and CASL permissions in NestJS SaaS Starter.

## Overview

The template implements a flexible authorization system combining:
- **RBAC (Role-Based Access Control)** - Users have roles
- **CASL (Code Access Security Layer)** - Fine-grained permission checks
- **Resource Ownership** - Users can manage their own resources

## Authorization Architecture

```
Account
  └── Roles (many-to-many)
        └── Permissions (many-to-many)

Permission = {
  action: "create" | "read" | "update" | "delete" | "manage",
  subject: "Example" | "Account" | ...
}
```

## Roles

### Default Roles

**Admin**:
- Has all permissions
- Can manage all resources
- Cannot be restricted

**User**:
- Basic permissions
- Can manage own resources
- Limited access

### Role Structure

```typescript
{
  id: "uuid",
  name: "Admin",
  description: "Administrator with full access",
  permissions: [
    { action: "manage", subject: "all" }
  ]
}
```

## Permissions

### Permission Structure

```typescript
interface Permission {
  action: Action;  // What can be done
  subject: string; // What it can be done to
}

enum Action {
  Manage = 'manage',  // All actions
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}
```

### Default Permissions

**Admin**:
- `{ action: "manage", subject: "all" }`

**User**:
- `{ action: "read", subject: "Example" }`
- `{ action: "create", subject: "Example" }`
- `{ action: "update", subject: "Example" }` (own resources only)
- `{ action: "delete", subject: "Example" }` (own resources only)

### Permission Subjects

Located in `libs/common/src/enums/permissions.enum.ts`:

```typescript
export enum Subject {
  Account = 'Account',
  Role = 'Role',
  Permission = 'Permission',
  Example = 'Example',
  // Add your subjects here
}
```

## Using @HasPermissions Decorator

### Basic Usage

```typescript
@Get('examples')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@HasPermissions({ action: Action.Read, subject: 'Example' })
async getExamples() {
  // Only users with "read" permission on "Example" can access
}
```

### CRUD Permissions

```typescript
@Controller('examples')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
export class ExampleController {
  @Post()
  @HasPermissions({ action: Action.Create, subject: 'Example' })
  async create() { ... }

  @Get()
  @HasPermissions({ action: Action.Read, subject: 'Example' })
  async findAll() { ... }

  @Get(':id')
  @HasPermissions({ action: Action.Read, subject: 'Example' })
  async findOne() { ... }

  @Patch(':id')
  @HasPermissions({ action: Action.Update, subject: 'Example' })
  async update() { ... }

  @Delete(':id')
  @HasPermissions({ action: Action.Delete, subject: 'Example' })
  async delete() { ... }
}
```

## Resource Ownership

### Implementing Ownership

Entities must implement `ownerId` getter:

```typescript
@Entity('examples')
export class Example extends TypeormBaseEntity {
  @Column()
  accountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  /**
   * Required for CASL ownership checks
   */
  get ownerId(): string {
    return this.account?.id || this.accountId;
  }
}
```

### Ownership Checking

Controllers must specify `ownerRelations`:

```typescript
export class ExampleController extends BaseController<Example> {
  /**
   * Relations to load for ownership verification
   */
  protected ownerRelations = ['account'];

  constructor(private readonly exampleService: ExampleService) {
    super(exampleService);
  }
}
```

### How It Works

```
User tries to update Example #123
  ↓
HasPermissionsGuard checks:
  1. Does user have "update" permission on "Example"? ✓
  ↓
  2. Fetch Example #123 with ownerRelations ['account']
  ↓
  3. Is user the owner? (req.user.id === example.ownerId)
     OR
     Does user have "manage" permission?
  ↓
  Yes → Allow
  No → 403 Forbidden
```

## CASL Ability System

### How Abilities Are Defined

```typescript
// libs/common/src/services/casl-ability.service.ts
defineAbility(account: Account) {
  const { can, cannot, build } = new AbilityBuilder(Ability);

  account.roles.forEach(role => {
    role.permissions.forEach(permission => {
      if (permission.action === 'manage' && permission.subject === 'all') {
        can('manage', 'all'); // Admin: can do anything
      } else {
        can(permission.action, permission.subject);
      }
    });
  });

  // Additional rules
  can(['update', 'delete'], 'Example', { ownerId: account.id });

  return build();
}
```

### Checking Abilities in Code

```typescript
// In a service or guard
const ability = this.caslAbilityService.defineAbilityFor(user);

if (ability.can('update', 'Example')) {
  // User can update examples
}

if (ability.can('update', example)) {
  // User can update this specific example
}
```

## Common Patterns

### 1. Public Endpoints (No Auth)

```typescript
@Get('public')
@Public() // Custom decorator to skip auth
async publicEndpoint() {
  return { message: 'No authentication required' };
}
```

### 2. Authenticated Only (No Permission Check)

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard) // No HasPermissionsGuard
async getProfile(@Request() req) {
  return req.user;
}
```

### 3. Permission Check (No Ownership)

```typescript
@Get('all-examples')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@HasPermissions({ action: Action.Read, subject: 'Example' })
async getAllExamples() {
  // Any user with "read" permission can access
  // Regardless of ownership
}
```

### 4. Permission + Ownership Check

```typescript
@Patch(':id')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@HasPermissions({ action: Action.Update, subject: 'Example' })
async updateExample(@Param('id') id: string) {
  // User must have "update" permission
  // AND own the resource (or be admin)
}
```

### 5. Admin Only

```typescript
@Delete('admin/delete-any/:id')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
@HasPermissions({ action: Action.Manage, subject: 'Example' })
async adminDelete(@Param('id') id: string) {
  // Only admin (manage permission) can access
}
```

## Managing Roles and Permissions

### Assign Role to User

```bash
POST /account/{accountId}/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "roleId": "role-uuid"
}
```

### Create Custom Role

```bash
POST /account/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Editor",
  "description": "Can edit content",
  "permissions": [
    { "action": "read", "subject": "Example" },
    { "action": "update", "subject": "Example" }
  ]
}
```

### Check User Permissions

```bash
GET /auth/me
Authorization: Bearer <token>
```

Response includes roles and permissions:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "roles": [
    {
      "id": "role-uuid",
      "name": "User",
      "permissions": [
        { "action": "read", "subject": "Example" },
        { "action": "create", "subject": "Example" }
      ]
    }
  ]
}
```

## Advanced Patterns

### Custom Permission Logic

```typescript
@Injectable()
export class CustomAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Custom logic
    if (user.email.endsWith('@admin.com')) {
      return true;
    }

    // Check specific permission
    const ability = this.caslAbilityService.defineAbilityFor(user);
    return ability.can('manage', 'all');
  }
}
```

### Conditional Permissions

```typescript
// In CASL ability definition
if (user.isVerified) {
  can('create', 'Post');
} else {
  cannot('create', 'Post');
}

// Ownership with conditions
can('update', 'Example', {
  ownerId: user.id,
  isPublished: false // Can only update unpublished examples
});
```

### Field-Level Permissions

```typescript
// Define abilities with fields
can('read', 'Example', ['title', 'description']);
can('read', 'Example', ['email'], { ownerId: user.id });

// Check in code
if (ability.can('read', 'Example', 'email')) {
  response.email = example.email;
}
```

## Testing Authorization

### Test as Different Roles

```typescript
describe('ExampleController', () => {
  it('should allow admin to delete any example', async () => {
    const adminToken = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .delete('/examples/123')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('should allow user to delete own example', async () => {
    const userToken = await loginAsUser();
    const example = await createExample(user.id);

    await request(app.getHttpServer())
      .delete(`/examples/${example.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });

  it('should forbid user from deleting others example', async () => {
    const userToken = await loginAsUser();
    const otherExample = await createExample('other-user-id');

    await request(app.getHttpServer())
      .delete(`/examples/${otherExample.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });
});
```

## Error Responses

### 401 Unauthorized

No or invalid JWT token:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden

No permission or not the owner:
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

## Best Practices

### ✅ Do

1. **Always use guards on protected endpoints**
   ```typescript
   @UseGuards(JwtAuthGuard, HasPermissionsGuard)
   ```

2. **Specify ownerRelations for ownership checks**
   ```typescript
   protected ownerRelations = ['account'];
   ```

3. **Use specific permissions**
   ```typescript
   @HasPermissions({ action: Action.Update, subject: 'Example' })
   ```

4. **Check permissions in services for complex logic**
   ```typescript
   if (!ability.can('update', example)) {
     throw new ForbiddenException();
   }
   ```

5. **Create custom roles for different user types**
   - Editor, Moderator, Viewer, etc.

### ❌ Don't

1. **Don't skip permission checks**
   ```typescript
   // Bad: No permission check
   @Get('sensitive-data')
   async getSensitiveData() { ... }
   ```

2. **Don't hardcode role names**
   ```typescript
   // Bad
   if (user.roles.includes('Admin')) { ... }

   // Good
   if (ability.can('manage', 'all')) { ... }
   ```

3. **Don't expose internal IDs without permission checks**

4. **Don't trust client-side permission checks**
   - Always validate on the server

## Extending the System

### Add New Permission Subject

1. **Add to enum**:
   ```typescript
   // libs/common/src/enums/permissions.enum.ts
   export enum Subject {
     // ...
     Post = 'Post',
   }
   ```

2. **Seed permissions**:
   ```typescript
   // apps/backend/src/database/seeds/roles-permissions.seed.ts
   const postPermissions = [
     { action: Action.Create, subject: Subject.Post },
     { action: Action.Read, subject: Subject.Post },
     { action: Action.Update, subject: Subject.Post },
     { action: Action.Delete, subject: Subject.Post },
   ];
   ```

3. **Use in controllers**:
   ```typescript
   @HasPermissions({ action: Action.Create, subject: 'Post' })
   ```

### Create Custom Role

```typescript
const editorRole = await roleRepository.save({
  name: 'Editor',
  description: 'Can create and edit content',
  permissions: [
    { action: 'create', subject: 'Post' },
    { action: 'update', subject: 'Post' },
    { action: 'read', subject: 'Post' },
  ],
});
```

## Debugging

### Check User Permissions

```typescript
// In any service
constructor(
  private caslAbilityService: CaslAbilityService
) {}

async debugPermissions(user: Account) {
  const ability = this.caslAbilityService.defineAbilityFor(user);

  console.log('Can create Example?', ability.can('create', 'Example'));
  console.log('Can manage all?', ability.can('manage', 'all'));

  // Log all rules
  console.log('Rules:', ability.rules);
}
```

### Enable Debug Logging

```typescript
// In HasPermissionsGuard
console.log('User:', user.id);
console.log('Required:', requiredPermission);
console.log('Has permission:', ability.can(action, subject));
console.log('Resource:', resource);
console.log('Owns resource:', resource?.ownerId === user.id);
```

## Next Steps

- [Authentication Guide](AUTHENTICATION.md) - Learn about auth strategies
- [Architecture Documentation](ARCHITECTURE.md) - Understand the system design
- [API Documentation](http://localhost:3000/api) - Explore all endpoints
