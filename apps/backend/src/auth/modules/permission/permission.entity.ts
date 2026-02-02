import { Column, Entity, ManyToOne } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { TypeormBaseEntity } from '@common';

@Entity("permissions")
export class Permission extends TypeormBaseEntity {
    @Column('simple-json', { nullable: false })
    action: string | string[];

    @Column('simple-json', { nullable: false })
    subject: string | string[];

    /** an array of fields to which user has (or not) access */
    @Column('simple-json', { nullable: true })
    fields: string[];
    /** an object of conditions which restricts the rule scope */
    @Column('simple-json', { nullable: true })
    conditions: any;
    /** indicates whether rule allows or forbids something */
    @Column({ nullable: true })
    inverted: boolean;
    /** message which explains why rule is forbidden */

    @Column({ nullable: true })
    reason: string;

    @ManyToOne(() => Role, role => role.permissions)
    role: Role;
}
