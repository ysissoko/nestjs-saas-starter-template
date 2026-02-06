# CASL ACL System - B2B Multi-Tenant Permissions

## Overview

This is a comprehensive **CASL-based permission system** designed for **B2B multi-tenant SaaS applications**. It provides fine-grained access control with:

- ✅ **Role-based permissions** (RBAC)
- ✅ **Resource-level conditions** (e.g., `companyId` isolation)
- ✅ **Field-level permissions** (hide sensitive fields per role)
- ✅ **Dynamic condition templates** (`${user.companyId}` resolution)
- ✅ **Audit logging** (track all permission changes)
- ✅ **Permission matrix UI** (Vue component for visual management)
- ✅ **Reusable across projects** (configurable subjects per project)

## Why This Level of Detail?

### For B2B Multi-Tenancy
- **Company isolation**: Automatic filtering by `companyId`
- **Hierarchical roles**: Company admins manage employees
- **Compliance**: Audit trails for corporate customers
- **Flexible permissions**: Each company can have custom role configurations

### For Reusability
- **Generic infrastructure**: Swap out subjects per project
- **Template-based conditions**: `${user.X}` works for any property
- **Modular guards**: Mix and match guards per route
- **Seed-based configuration**: Different default roles per project

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Permission Flow                         │
└─────────────────────────────────────────────────────────────┘

Request → JwtAuthGuard → HasPermissionsGuard → Controller
                              ↓
                    CaslAbilityService
                    ↓              ↓
         Get Role Rules    Resolve Conditions
                    ↓              ↓
              ConditionResolverService
                (${user.companyId} → 123)
                    ↓
              Check Permission
              (Allow/Deny)
```

## Roles (B2B Fitness Platform)

### 1. **Admin** (Super Administrator)
- **Access**: Full system (Action.Manage on Subject.All)
- **Use Case**: Platform administrators, DevOps
- **Example**: Configure system settings, manage all companies

### 2. **Coach** (Fitness Instructors)
- **Access**: Courses, consultations, student metrics
- **Conditions**: Only their own courses/students
- **Use Case**: Personal trainers, fitness instructors
- **Example**: Create workout plans, view student progress

### 3. **Company Admin** (B2B Administrators)
- **Access**: Company, employees, subscriptions, analytics
- **Conditions**: Only their company (`companyId` isolation)
- **Use Case**: HR managers, corporate wellness coordinators
- **Example**: Assign courses to employees, view company analytics

### 4. **Employee** (Company Members)
- **Access**: Company-assigned content, own metrics
- **Conditions**: Own data + company data
- **Use Case**: Corporate employees using company fitness plan
- **Example**: View assigned courses, track workout progress

### 5. **Member** (Individual Users)
- **Access**: Browse courses, manage own subscriptions
- **Conditions**: Own data only
- **Use Case**: B2C individual customers
- **Example**: Enroll in courses, book consultations

## Permission Conditions

### Template Variables

Conditions support dynamic template resolution:

```typescript
// Original condition in database
{
  companyId: '${user.companyId}'
}

// Resolved for user with companyId = 123
{
  companyId: 123
}
```

**Supported paths:**
- `${user.id}` - User ID
- `${user.companyId}` - Company ID
- `${user.coach.id}` - Nested coach ID
- `${user.role.name}` - Role name
- Any nested property on `user` object

### Common Patterns

**Company Isolation:**
```typescript
{
  action: Action.Read,
  subject: Subject.Employee,
  conditions: { companyId: '${user.companyId}' }
}
```

**Owner Isolation:**
```typescript
{
  action: Action.Update,
  subject: Subject.Profile,
  conditions: { accountId: '${user.id}' }
}
```

**Nested Isolation:**
```typescript
{
  action: Action.Read,
  subject: Subject.Enrollment,
  conditions: { course: { coachId: '${user.coach.id}' } }
}
```

## Field-Level Permissions

Restrict which fields a role can access:

```typescript
{
  action: Action.Read,
  subject: Subject.Payment,
  conditions: { companyId: '${user.companyId}' },
  fields: ['amount', 'date', 'status', 'plan'], // Hide payment method details
}
```

**Use Cases:**
- Hide billing info from employees
- Show limited company info to employees
- Restrict salary data to HR only

## Usage Examples

### In Controllers

```typescript
import { HasPermissions } from '../decorators/has-permissions.decorator';
import { Action, Subject } from '@common/enums/permissions.enum';

@Controller('employees')
@UseGuards(JwtAuthGuard, HasPermissionsGuard)
export class EmployeeController {
  // All company admins can create employees in their company
  @Post()
  @HasPermissions({ action: Action.Create, subject: Subject.Employee })
  async create(@Body() dto: CreateEmployeeDto, @Req() request: Request) {
    const user = request.user as Account;

    // Conditions are automatically checked!
    // If user.companyId = 123, they can only create employees with companyId = 123
    return this.employeeService.create(dto);
  }

  // Company admins can only view their company's employees
  @Get()
  @HasPermissions({ action: Action.Read, subject: Subject.Employee })
  async getAll(@Req() request: Request) {
    const user = request.user as Account;

    // This will automatically filter by companyId
    return this.employeeService.findAll({
      where: { companyId: user.companyId }
    });
  }
}
```

### Resource-Level Checks

```typescript
import { CheckResourceOwner } from '../decorators/check-resource-owner.decorator';

@Controller('courses')
export class CourseController {
  // Only coach who owns the course can update it
  @Patch(':id')
  @UseGuards(JwtAuthGuard, HasPermissionsGuard, ResourceOwnerGuard)
  @HasPermissions({ action: Action.Update, subject: Subject.Course })
  @CheckResourceOwner({
    resourceGetter: async (request, service) => {
      const courseId = request.params.id;
      return service.findOne(courseId);
    },
    ownerField: 'coach.id', // Nested property access
    allowAdminOverride: true, // Admins can bypass ownership check
  })
  async update(@Param('id') id: number, @Body() dto: UpdateCourseDto) {
    return this.courseService.update(id, dto);
  }
}
```

### Programmatic Checks

```typescript
import { CaslAbilityService } from '../auth/account/permission/casl-ability.service';

export class CourseService {
  constructor(
    private readonly caslAbilityService: CaslAbilityService,
  ) {}

  async updateCourse(user: Account, courseId: number, dto: UpdateCourseDto) {
    // Get the course
    const course = await this.courseRepository.findOne(courseId);

    // Check permission with resource-level conditions
    const canUpdate = await this.caslAbilityService.checkUserAbilityWithConditions(
      user,
      Action.Update,
      course, // Pass the actual resource
    );

    if (!canUpdate) {
      throw new ForbiddenException('Cannot update this course');
    }

    // Proceed with update
    return this.courseRepository.save({ ...course, ...dto });
  }
}
```

## Seed Data

Run seeds to populate default roles and permissions:

```bash
npm run seed
```

This creates:
- **1 admin role** with full access
- **4 specialized roles** (coach, company_admin, employee, member)
- **43 total permissions** across all roles

### Customizing for Your Project

Edit `apps/gateway/src/database/seeds/roles-permissions.seed.ts`:

```typescript
// Add new role
const customRole = roleRepository.create({
  name: 'content_manager',
  description: 'Manages content but not users',
});

const customPermissions = await permissionRepository.save([
  {
    action: [Action.Create, Action.Read, Action.Update, Action.Delete],
    subject: Subject.Course,
    reason: 'Content managers manage courses',
  },
  {
    action: Action.Read,
    subject: Subject.CourseCategory,
    reason: 'Content managers view categories',
  },
]);

customRole.permissions = customPermissions;
await roleRepository.save(customRole);
```

## Permission Matrix UI

### Backend API

```typescript
// Get full permission matrix (subjects × actions)
GET /permission-management/matrix

// Get role-specific matrix
GET /permission-management/matrix/role/:roleId

// Test permission for a user
POST /permission-management/test
{
  "userId": 1,
  "action": "read",
  "subject": "courses"
}

// Bulk add permissions
POST /permission-management/bulk-add
{
  "roleId": 2,
  "permissions": [
    { "action": "read", "subject": "courses" },
    { "action": "create", "subject": "courses" }
  ]
}

// Bulk remove permissions
DELETE /permission-management/bulk-remove
{
  "roleId": 2,
  "permissionIds": ["perm-id-1", "perm-id-2"]
}
```

### Frontend Component

```vue
<template>
  <PermissionMatrix />
</template>

<script setup>
import PermissionMatrix from '@/components/permission-matrix.vue';
</script>
```

**Features:**
- Interactive grid (subjects × actions)
- Role selector
- Bulk toggles (enable/disable entire action column)
- Search and filter
- Real-time change tracking
- Save/discard changes

## Audit Logging

All permission and role changes are automatically logged:

```typescript
// Logged actions:
- GRANT_PERMISSION
- REVOKE_PERMISSION
- UPDATE_PERMISSION
- CREATE_ROLE
- UPDATE_ROLE
- DELETE_ROLE
- ASSIGN_ROLE
- REVOKE_ROLE
- UPDATE_ACCOUNT_ROLE
```

**Query audit logs:**
```typescript
GET /permission-management/audit-logs?page=1&limit=50&action=GRANT_PERMISSION
GET /permission-management/audit-logs/entity/Role/123
GET /permission-management/audit-logs/actor/456
```

**Each log includes:**
- Actor (who made the change)
- Action performed
- Entity type and ID
- Changes (before/after)
- Description
- IP address
- User agent
- Timestamp

## Reusability Across Projects

### Example: E-Learning Platform

**Subjects:**
```typescript
export enum Subject {
  Lesson = 'lessons',
  Assignment = 'assignments',
  Instructor = 'instructors',
  School = 'schools',
  Student = 'students',
  Grade = 'grades',
  // ...
}
```

**Roles:**
- `admin` - Platform admin
- `school_admin` - School administrator
- `instructor` - Teacher
- `student` - Student
- `parent` - Parent with read-only access

**Conditions:**
```typescript
// School isolation
{ schoolId: '${user.schoolId}' }

// Class isolation
{ class: { instructorId: '${user.instructor.id}' } }
```

### Example: Project Management SaaS

**Subjects:**
```typescript
export enum Subject {
  Project = 'projects',
  Task = 'tasks',
  Team = 'teams',
  Workspace = 'workspaces',
  // ...
}
```

**Roles:**
- `admin` - Platform admin
- `workspace_admin` - Workspace owner
- `project_manager` - PM role
- `team_member` - Regular member

**Conditions:**
```typescript
// Workspace isolation
{ workspaceId: '${user.workspaceId}' }

// Project member check
{ members: { $in: ['${user.id}'] } }
```

## Best Practices

### 1. Always Use Conditions for Multi-Tenancy
```typescript
// ✅ Good
{
  action: Action.Read,
  subject: Subject.Employee,
  conditions: { companyId: '${user.companyId}' }
}

// ❌ Bad - allows reading all employees
{
  action: Action.Read,
  subject: Subject.Employee
}
```

### 2. Use Field-Level Permissions for Sensitive Data
```typescript
// ✅ Good - hide payment method
{
  action: Action.Read,
  subject: Subject.Payment,
  fields: ['amount', 'date', 'status']
}

// ❌ Bad - exposes full payment details
{
  action: Action.Read,
  subject: Subject.Payment
}
```

### 3. Combine Guards for Defense in Depth
```typescript
@UseGuards(JwtAuthGuard, HasPermissionsGuard, ResourceOwnerGuard)
```

### 4. Log Sensitive Operations
Already done automatically for role/permission changes. Add custom logging for:
- Payment transactions
- Data exports
- Account deletions

### 5. Test Permissions in Development
```bash
curl -X POST http://localhost:3000/permission-management/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "action": "update",
    "subject": "employees",
    "resourceData": { "companyId": 123 }
  }'
```

## Troubleshooting

### Permission Denied Unexpectedly

1. **Check role assignment:**
   ```sql
   SELECT a.id, a.email, r.name as role
   FROM accounts a
   LEFT JOIN roles r ON a.role_id = r.id
   WHERE a.id = 123;
   ```

2. **Check role permissions:**
   ```sql
   SELECT p.*
   FROM permissions p
   JOIN role_permissions rp ON p.id = rp.permission_id
   WHERE rp.role_id = (SELECT role_id FROM accounts WHERE id = 123);
   ```

3. **Test permission:**
   ```bash
   curl -X POST /permission-management/test \
     -d '{"userId": 123, "action": "read", "subject": "courses"}'
   ```

4. **Check condition resolution:**
   - Verify `user.companyId` is set
   - Check nested properties exist (e.g., `user.coach`)
   - Review logs for condition resolver errors

### Condition Templates Not Working

- Ensure `ConditionResolverService` is injected in `PermissionModule`
- Check that template syntax is correct: `${user.property}`
- Verify the property exists on the user object
- Review condition resolver logs

### Cache Not Refreshing

```typescript
// Clear all abilities cache
await permissionManagementService.clearAbilitiesCache();

// Refresh specific role
await permissionManagementService.refreshRoleAbility(roleId);
```

## Testing

### Unit Tests
```bash
npm run test apps/gateway/src/auth/account/permission/casl-ability.service.spec.ts
```

### Integration Tests
```bash
npm run test:e2e apps/gateway/test/permission.e2e-spec.ts
```

### Manual Testing
1. Seed database: `npm run seed`
2. Create test users with different roles
3. Use permission matrix UI to grant/revoke permissions
4. Test API endpoints with different user contexts

## Migration Guide

### From Simple RBAC to CASL

**Before:**
```typescript
@Roles('admin', 'coach')
```

**After:**
```typescript
@HasPermissions({ action: Action.Read, subject: Subject.Course })
```

### Adding New Subjects

1. Add to `Subject` enum in `libs/common/src/enums/permissions.enum.ts`
2. Update seed data with permissions for the new subject
3. Add to permission matrix UI (automatic via enum)
4. Apply guards to controllers
5. Run migration: `npm run seed`

## Performance Considerations

- **Role abilities are cached** in memory (Map<roleId, rules>)
- **Abilities are compiled per-request** (conditions resolved per-user)
- **Cache refresh** is automatic on permission changes
- **Database queries** are optimized with eager loading
- **Audit logs** use indexed queries (actor_id, action, entityType, createdAt)

## Security Considerations

- ✅ HTTP-only cookies for JWT (XSS protection)
- ✅ CORS configured for trusted origins
- ✅ Helmet middleware for security headers
- ✅ Rate limiting on permission endpoints
- ✅ SQL injection protection (TypeORM parameterized queries)
- ✅ Audit trail for compliance
- ✅ Field-level permissions for sensitive data
- ✅ Resource-level conditions for multi-tenancy

## Support

- **Documentation**: This README
- **API Docs**: `web/src/services/README.md`
- **Seed Data**: `apps/gateway/src/database/seeds/`
- **Frontend Services**: `web/src/services/permission-management.service.ts`
- **UI Component**: `web/src/components/permission-matrix.vue`

## License

Part of Gym Fit Hub - Proprietary
