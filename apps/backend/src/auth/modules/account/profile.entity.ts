import { TypeormBaseEntity } from '@common';
import { Column, Entity, } from 'typeorm';

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
}

@Entity('profiles')
export class Profile extends TypeormBaseEntity {
  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column({ nullable: true })
  bio: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: false,
  })
  gender: Gender;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column()
  phoneCode: string;

  @Column()
  countryCode: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ nullable: true })
  dateOfBirth: Date;
}
