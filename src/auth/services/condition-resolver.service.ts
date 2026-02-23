import { Injectable, Logger } from '@nestjs/common';
import { Account } from '@auth/modules/account/account.entity';

/**
 * Condition Resolver Service
 *
 * Resolves template variables in permission conditions for multi-tenant isolation.
 * Supports nested property access and dynamic value resolution.
 *
 * Examples:
 * - ${user.id} → actual user ID
 * - ${user.companyId} → user's company ID
 * - ${user.coach.id} → nested coach ID
 * - ${user.role.name} → role name
 */
@Injectable()
export class ConditionResolverService {
  private logger = new Logger(ConditionResolverService.name);

  /**
   * Resolve all template variables in conditions object
   *
   * @param conditions - Original conditions with template variables
   * @param user - Current authenticated user
   * @returns Resolved conditions with actual values
   */
  resolveConditions(
    conditions: Record<string, any> | undefined,
    user: Account,
  ): Record<string, any> | undefined {
    if (!conditions) {
      return undefined;
    }

    try {
      return this.resolveObject(conditions, user);
    } catch (error) {
      this.logger.error(
        `Failed to resolve conditions: ${error.message}`,
        error.stack,
      );
      // Return original conditions if resolution fails
      return conditions;
    }
  }

  /**
   * Recursively resolve an object with template variables
   */
  private resolveObject(obj: any, user: Account): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveObject(item, user));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const resolved: Record<string, any> = {};

      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObject(value, user);
      }

      return resolved;
    }

    // Handle strings with template variables
    if (typeof obj === 'string') {
      return this.resolveString(obj, user);
    }

    // Return primitive values as-is
    return obj;
  }

  /**
   * Resolve template variables in a string
   *
   * @param str - String with potential template variables
   * @param user - Current user
   * @returns Resolved value
   */
  private resolveString(str: string, user: Account): any {
    // Check if string contains template variable
    const templateRegex = /^\$\{(.+)\}$/;
    const match = str.match(templateRegex);

    if (!match) {
      // Not a template, return as-is
      return str;
    }

    const path = match[1].trim();

    // Resolve the path
    return this.resolvePath(path, user);
  }

  /**
   * Resolve a property path on the user object
   *
   * Supports:
   * - Simple: user.id
   * - Nested: user.coach.id
   * - Deep nested: user.company.subscription.plan.id
   *
   * @param path - Property path (e.g., "user.id", "user.companyId")
   * @param user - Current user
   * @returns Resolved value
   */
  private resolvePath(path: string, user: Account): any {
    // Remove 'user.' prefix if present
    const normalizedPath = path.startsWith('user.')
      ? path.substring(5)
      : path;

    const parts = normalizedPath.split('.');
    let current: any = user;

    for (const part of parts) {
      if (current === null || current === undefined) {
        this.logger.warn(
          `Cannot resolve path "${path}": property "${part}" is null/undefined`,
        );
        return undefined;
      }

      current = current[part];
    }

    // Log for debugging
    this.logger.debug(`Resolved ${path} → ${current}`);

    return current;
  }

  /**
   * Check if conditions contain template variables
   *
   * @param conditions - Conditions to check
   * @returns True if contains templates
   */
  hasTemplateVariables(conditions: Record<string, any> | undefined): boolean {
    if (!conditions) {
      return false;
    }

    const str = JSON.stringify(conditions);
    return /\$\{.+\}/.test(str);
  }

  /**
   * Get all template variables from conditions
   *
   * @param conditions - Conditions to analyze
   * @returns Array of template variable paths
   */
  extractTemplateVariables(
    conditions: Record<string, any> | undefined,
  ): string[] {
    if (!conditions) {
      return [];
    }

    const str = JSON.stringify(conditions);
    const matches = str.match(/\$\{(.+?)\}/g);

    if (!matches) {
      return [];
    }

    return matches.map((match) => match.slice(2, -1).trim());
  }

  /**
   * Validate that all template variables can be resolved
   *
   * @param conditions - Conditions to validate
   * @param user - Current user
   * @returns Array of unresolvable paths (empty if all valid)
   */
  validateTemplateVariables(
    conditions: Record<string, any> | undefined,
    user: Account,
  ): string[] {
    if (!conditions) {
      return [];
    }

    const variables = this.extractTemplateVariables(conditions);
    const unresolvable: string[] = [];

    for (const variable of variables) {
      const path = variable.startsWith('user.')
        ? variable.substring(5)
        : variable;

      const value = this.resolvePath(path, user);

      if (value === undefined || value === null) {
        unresolvable.push(variable);
      }
    }

    return unresolvable;
  }

  /**
   * Build company isolation conditions
   * Helper for quickly adding company isolation to queries
   *
   * @param user - Current user
   * @returns Conditions object for company isolation
   */
  buildCompanyIsolation(user: Account & { companyId?: number }): Record<string, any> | undefined {
    if (!user.companyId) {
      return undefined;
    }

    return {
      companyId: user.companyId,
    };
  }

  /**
   * Build owner isolation conditions
   * Helper for quickly adding owner isolation to queries
   *
   * @param user - Current user
   * @param ownerField - Field name that contains owner ID (default: 'accountId')
   * @returns Conditions object for owner isolation
   */
  buildOwnerIsolation(
    user: Account,
    ownerField: string = 'accountId',
  ): Record<string, any> {
    return {
      [ownerField]: user.id,
    };
  }
}
