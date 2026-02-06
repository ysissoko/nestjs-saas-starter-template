import { createMongoAbility, MongoAbility, Subject } from '@casl/ability';
import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@auth/entities/role.entity';
import { InitRoleAbilitiesException } from '@common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ID } from '@common';
import { Account } from '@auth/modules/account/account.entity';
import { Action } from '@common';
import { ConditionResolverService } from '@auth/services/condition-resolver.service';
import { RoleService } from '../role/role.service';

@Injectable()
export class CaslAbilityService {
  private readonly logger = new Logger(CaslAbilityService.name);
  private roleAbilities: Map<ID, any[]> = new Map(); // Store raw rules, not abilities

  constructor(
    private readonly roleService: RoleService,
    private readonly conditionResolver: ConditionResolverService,
  ) {
    this.initRolesAbilities()
      .then(() => {
        this.logger.log('Role abilities initialized');
      })
      .catch((error) => {
        this.logger.error('Error initializing role abilities', error);
      });
  }

  public async initRolesAbilities(filter = {}): Promise<void> {
    try {
      const roles: Role[] = await this.roleService.find({
        relations: ['permissions'],
        where: filter,
      });

      for (const { id: roleId, permissions } of roles) {
        // Store raw rules with unparsed conditions (will be resolved per-user)
        const rules = permissions.map((p) => ({
          action: Array.isArray(p.action) ? p.action : [p.action],
          subject: Array.isArray(p.subject) ? p.subject : [p.subject],
          fields: p.fields
            ? Array.isArray(p.fields)
              ? p.fields
              : JSON.parse(p.fields as any)
            : undefined,
          conditions: p.conditions
            ? typeof p.conditions === 'object'
              ? p.conditions
              : JSON.parse(p.conditions as any)
            : undefined,
          inverted: p.inverted,
          reason: p.reason,
        }));

        // Store raw rules, not compiled abilities
        this.roleAbilities.set(roleId, rules);
      }

      this.logger.log(`Initialized abilities for ${roles.length} roles`);
    } catch (error) {
      this.logger.error('Error loading roles from database', error);
      throw new InitRoleAbilitiesException('Error initializing role abilities');
    }
  }

  defineAbilityForUser(user: Account): MongoAbility | undefined {
    if (!user.role) {
      this.logger.warn(`User ${user.id} has no role assigned`);
      return undefined;
    }

    const role = user.role;
    const rawRules = this.roleAbilities.get(role.id);

    if (!rawRules) {
      this.logger.warn(`Role ${role.id} not found in abilities cache`);
      return undefined;
    }

    // Resolve conditions for this specific user
    const resolvedRules = rawRules.map((rule) => ({
      ...rule,
      conditions: rule.conditions
        ? this.conditionResolver.resolveConditions(rule.conditions, user)
        : undefined,
    }));

    // Create user-specific ability with resolved conditions
    return createMongoAbility(resolvedRules);
  }

  public async checkUserAbility(
    user: Account,
    action: Action | string,
    subject: Subject | string,
    field?: string,
  ): Promise<boolean> {
    const ability = this.defineAbilityForUser(user);
    if (!ability) return false;

    try {
      return ability.can(action, subject, field);
    } catch (error) {
      this.logger.error(`Error checking ability: ${error.message}`);
      return false;
    }
  }

  public async checkUserAbilityWithConditions(
    user: Account,
    action: Action | string,
    resource: any,
    field?: string,
  ): Promise<boolean> {
    const ability = this.defineAbilityForUser(user);
    if (!ability) return false;

    try {
      // CASL will automatically check conditions against the resource object
      return ability.can(action, resource, field);
    } catch (error) {
      this.logger.error(`Error checking conditional ability: ${error.message}`);
      return false;
    }
  }

  public async refreshRoleAbility(roleId: ID): Promise<void> {
    await this.initRolesAbilities({ id: roleId });
    this.logger.log(`Refreshed ability for role ${roleId}`);
  }

  public clearAbilitiesCache(): void {
    this.roleAbilities.clear();
    this.logger.log('Abilities cache cleared');
  }
}
