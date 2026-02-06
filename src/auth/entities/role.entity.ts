import { Column, Entity, OneToMany } from 'typeorm';
import { Permission } from '../modules/permission/permission.entity';
import { Account } from '../modules/account/account.entity';
import { TypeormBaseEntity } from '@common';

@Entity('roles')
export class Role extends TypeormBaseEntity {
    @Column({ unique: true })
    name: string;

    @OneToMany(() => Permission, permission => permission.role, { eager: true, cascade: true })
    permissions: Permission[];

    @OneToMany(() => Account, account => account.role)
    accounts: Account[];

    @Column({ nullable: true })
    description: string;
}
