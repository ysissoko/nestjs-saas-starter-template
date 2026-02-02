import { TypeormBaseEntity } from '@common';
import { Column, Entity } from 'typeorm';
/**
 * Example entity representing an example table in the database. Can be removed
 */
@Entity('example')
export class Example extends TypeormBaseEntity {

  @Column()
  exampleField: string;
}
