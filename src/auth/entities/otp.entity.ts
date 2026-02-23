import { TypeormBaseEntity } from '@common';
import { Column, Entity } from "typeorm";

@Entity('otp')
export class Otp extends TypeormBaseEntity {
    @Column()
    code: string; 

    @Column()
    expiry: Date;
}
