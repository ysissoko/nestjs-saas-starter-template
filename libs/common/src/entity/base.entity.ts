import { Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, BaseEntity } from "typeorm";

export type ID = number;

export abstract class TypeormBaseEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: ID;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedAt?: Date | null;

  /**
   * Virtual property that returns the owner's account ID if the entity is owned by an account.
   * This property is used for CASL permission checks to verify resource ownership.
   *
   * By default, looks for a direct 'account' relation on the entity.
   * Can be overridden in child entities for complex ownership patterns.
   *
   * @returns The account ID of the owner, or undefined if no owner or relation not loaded
   *
   * @example
   * // Direct ownership (Subscription, Enrollment, etc.)
   * subscription.ownerId // returns subscription.account.id
   *
   * @example
   * // Complex ownership (override in child entity)
   * // Course -> Coach -> Account
   * get ownerId() { return this.coach?.account?.id; }
   */
  get ownerId(): ID | undefined {
    const entity = this as any;
    return entity.account?.id;
  }
}
