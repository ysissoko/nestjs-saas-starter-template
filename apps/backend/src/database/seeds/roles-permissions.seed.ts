import { DataSource } from 'typeorm';
import { Role } from '../../auth/entities/role.entity';
import { Permission } from '../../auth/modules/permission/permission.entity';
import { Action, Subject } from '@common';

/**
 * Seed roles and permissions here for all your platform needs.
 * 
 * Roles:
 * - Super Admin: Full system access
 * - Company Admin: Manage company, employees, view company analytics
 */
export async function seedRolesAndPermissions(dataSource: DataSource) {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  console.log('Seeding roles and permissions...');

  // ============================================================================
  // 1. SUPER ADMIN - Full system access
  // ============================================================================
  const adminRole = roleRepository.create({
    name: 'admin',
    description: 'Super administrator with full system access',
  });
  await roleRepository.save(adminRole);

  const adminPermission = permissionRepository.create({
    action: Action.Manage,
    subject: Subject.All,
    reason: 'Full system access',
  });
  await permissionRepository.save(adminPermission);
  adminRole.permissions = [adminPermission];
  await roleRepository.save(adminRole);

  console.log('✓ Created admin role with full access');

  // ============================================================================
  // 3. COMPANY ADMIN - B2B Company Administrators
  // ============================================================================
  const companyAdminRole = roleRepository.create({
    name: 'company_admin',
    description: 'Company administrator managing employees and subscriptions',
  });
  await roleRepository.save(companyAdminRole);

  const companyAdminPermissions = await permissionRepository.save([
    // Company - Manage own company
    {
      action: [Action.Read, Action.Update],
      subject: Subject.Company,
      conditions: { id: '${user.companyId}' }, // Can manager their own company
      reason: 'Company admins manage their company',
    }
  ]);

  console.log('✓ Created company_admin role with company-specific permissions');

  companyAdminRole.permissions = companyAdminPermissions;
  await roleRepository.save(companyAdminRole);
}
