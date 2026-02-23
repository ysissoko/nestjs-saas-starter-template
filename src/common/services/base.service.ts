import { ID, TypeormBaseEntity } from "@common/entity/base.entity";
import { DeepPartial, DeleteResult, FindManyOptions, FindOneOptions, FindOptionsOrder, FindOptionsWhere, ILike, Repository, SaveOptions, UpdateResult } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Pagination, PaginationOptionsInterface } from '../pagination';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Base service class providing common CRUD operations for TypeORM entities.
 * @template T - Entity type extending TypeormBaseEntity
 */
export class BaseService<T extends TypeormBaseEntity> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Paginate entities with filtering, relations, and sorting.
   * @param options - Pagination options including page, limit, where, relations, like, and order
   * @returns Promise resolving to Pagination object with results and metadata
   * @throws {BadRequestException} If page or limit are invalid
   * @example
   * const result = await service.paginate({
   *   page: 1,
   *   limit: 10,
   *   where: { status: 'active' },
   *   like: [{ name: 'John' }]
   * });
   */
  async paginate(options: PaginationOptionsInterface): Promise<Pagination<T>> {
    const { page, limit: take, where, relations, like, order } = options;

    if(page <= 0 || take <= 0){
      throw new BadRequestException('Page and limit must be greater  than 0');
    }

    if (!Number.isInteger(page) || !Number.isInteger(take)) {
      throw new BadRequestException('Page and limit must be integers');
    }

    const filter = {
      where : where || {},
      relations : relations || [],
      take,
      skip: (page - 1) * take,
      order: order || { createdAt: 'DESC' } as FindOptionsOrder<T>
    };

    if (like && like.length > 0) {
      const likeConditions = like.map((item: any) => {
        const [[key, value]] = Object.entries(item);
        if (value && typeof value === 'string' && value.trim()) {
          return { [key]: ILike(`%${value.trim()}%`) };
        }
        return null;
      }).filter(Boolean);


      if (likeConditions.length > 0) {
        if (Array.isArray(filter.where)) {
          // Merge arrays (OR logic)
          filter.where = [...filter.where, ...likeConditions];
        } else if (filter.where && Object.keys(filter.where).length > 0) {
          // Convert object to array with like conditions (OR logic)
          filter.where = [filter.where, ...likeConditions];
        } else {
          // No existing where, just use like conditions
          filter.where = likeConditions;
        }
      }
    }

    const [results, total] = await this.repository.findAndCount(filter as any);

    return new Pagination<T>({
      results,
      total,
      page,
      limit: take
    });
  }

  /**
   * Find all entities matching the criteria.
   * @param options - TypeORM FindManyOptions for filtering and relations
   * @returns Promise resolving to array of entities
   * @example
   * const users = await service.find({ where: { status: 'active' } });
   */
  find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options || {});
  }

  /**
   * @deprecated Use find() instead. Will be removed in v2.0
   */
  all(options?: FindManyOptions<T>): Promise<T[] | []>{
    return this.find(options);
  }

  /**
   * Find one entity matching the criteria.
   * @param filter - TypeORM FindOneOptions for filtering
   * @returns Promise resolving to entity or null if not found
   * @example
   * const user = await service.findOne({ where: { email: 'test@example.com' } });
   * if (!user) {
   *   throw new NotFoundException('User not found');
   * }
   */
  findOne(filter: FindOneOptions<T>): Promise<T | null>{
    return this.repository.findOne(filter);
  }

  /**
   * Find one entity or throw NotFoundException if not found.
   * @param filter - TypeORM FindOneOptions for filtering
   * @returns Promise resolving to entity
   * @throws {NotFoundException} If entity is not found
   * @example
   * const user = await service.findOneOrFail({ where: { email: 'test@example.com' } });
   */
  async findOneOrFail(filter: FindOneOptions<T>): Promise<T> {
    const entity = await this.findOne(filter);
    if (!entity) {
      throw new NotFoundException(`${this.repository.metadata.tableName} not found`);
    }
    return entity;
  }

  /**
   * Create a new entity.
   * @param entity - Partial entity data to create
   * @param options - TypeORM SaveOptions
   * @returns Promise resolving to the created entity
   * @example
   * const newUser = await service.create({ name: 'John', email: 'john@example.com' });
   */
  async create(entity: DeepPartial<T>, options?: SaveOptions): Promise<T> {
    const saved = await this.repository.save(entity, options);
    return saved as T;
  }

  /**
   * Update an entity by ID.
   * @param id - Entity ID
   * @param entity - Partial entity data to update
   * @returns Promise resolving to UpdateResult
   * @example
   * const result = await service.update(1, { name: 'Jane' });
   */
  update(id: ID, entity: QueryDeepPartialEntity<T>): Promise<UpdateResult> {
    return this.repository.update(id, entity);
  }

  /**
   * Update an entity by ID and return the updated entity.
   * @param id - Entity ID
   * @param entity - Partial entity data to update
   * @returns Promise resolving to updated entity or null if not found
   * @example
   * const updatedUser = await service.updateAndReturn(1, { name: 'Jane' });
   */
  async updateAndReturn(id: ID, entity: QueryDeepPartialEntity<T>): Promise<T | null> {
    await this.repository.update(id, entity);
    return this.findById(id);
  }

  /**
   * Find an entity by its ID.
   * @param id - Entity ID
   * @param relations - Optional array of relations to load
   * @returns Promise resolving to entity or null if not found
   * @example
   * const user = await service.findById(1, ['posts', 'comments']);
   */
  findById(id: ID, relations?: string[]): Promise<T | null> {
    if (relations && relations.length > 0) {
      const whereCondition = { id } as FindOptionsWhere<T>;
      return this.repository.findOne({
        where: whereCondition,
        relations
      });
    }
    return this.repository.findOneBy({ id } as FindOptionsWhere<T>);
  }

  /**
   * Delete an entity by ID.
   * @param id - Entity ID
   * @returns Promise resolving to DeleteResult
   * @example
   * const result = await service.delete(1);
   */
  delete(id: ID): Promise<DeleteResult> {
    return this.repository.delete(id);
  }

  /**
   * Count entities matching the criteria.
   * @param where - Optional where clause for filtering
   * @returns Promise resolving to count of entities
   * @example
   * const activeCount = await service.count({ status: 'active' });
   */
  count(where?: FindManyOptions<T>['where']): Promise<number> {
    return this.repository.count({ where } as FindManyOptions<T>);
  }
}
