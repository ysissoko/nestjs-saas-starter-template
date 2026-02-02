import {
  Body,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import { DeepPartial, DeleteResult, FindManyOptions, FindOneOptions, UpdateResult } from 'typeorm';
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { ID, TypeormBaseEntity } from "../entity/base.entity";
import { Pagination, PaginationOptionsInterface } from "../pagination";
import { BaseService } from "../services/base.service";
import { Action } from "../enums/acl/action.enum";

/**
 * Base CRUD controller with built-in authorization decorators.
 *
 * IMPORTANT: Controllers extending this class MUST apply guards at the class level:
 * @UseGuards(JwtAuthGuard, HasPermissionsGuard)
 *
 * The @HasPermissions decorator on each method will infer the subject from the controller's route path.
 * For example, a controller with @Controller('coaches') will automatically use Subject.Coach.
 *
 * If you need custom authorization logic, you can override methods and add custom decorators.
 *
 * ## Owner Relations for CASL
 * To enable automatic permission checks via the `ownerId` getter, define the relations
 * needed to resolve ownership. These relations will be loaded automatically when fetching
 * resources by ID (for update/delete operations).
 *
 * @example
 * // For direct ownership (Subscription -> Account)
 * protected ownerRelations = ['account'];
 *
 * @example
 * // For indirect ownership (Course -> Coach -> Account)
 * protected ownerRelations = ['coach', 'coach.account'];
 *
 * @example
 * // For deep ownership (Workout -> Course -> Coach -> Account)
 * protected ownerRelations = ['course', 'course.coach', 'course.coach.account'];
 */
export abstract class BaseController<T extends TypeormBaseEntity> {
  protected service: BaseService<T>;

  /**
   * Relations to load for ownership verification in CASL permission checks.
   * Override this in child controllers to specify the relations needed for `ownerId` getter.
   */
  protected ownerRelations?: string[];

  constructor(_service: BaseService<T>) {
    this.service = _service;
  }

  /**
   * Get all items matching the provided criteria.
   * Requires Read permission on the entity.
   */
  @Post("all")
  getAll(@Body() dto: FindManyOptions<T>): Promise<T[]> {
    return this.service.all(dto);
  }

  /**
   * Get paginated items.
   * Requires Read permission on the entity.
   */
  @Post("paginate")
  searchItems(@Body() searchOptions: PaginationOptionsInterface): Promise<Pagination<T>> {
    return this.service.paginate(searchOptions);
  }

  /**
   * Query a single item matching the provided criteria.
   * Requires Read permission on the entity.
   */
  @Post("query")
  queryItem(@Body() queryOptions: FindOneOptions<T>): Promise<T> {
    return this.service.findOne(queryOptions);
  }

  /**
   * List all items (no filters).
   * Requires Read permission on the entity.
   */
  @Get("list")
  listAllItems(): Promise<T[]> {
    return this.service.all();
  }

  /**
   * Get a single item by ID.
   * Requires Read permission on the entity.
   * Automatically loads ownerRelations for CASL permission checks.
   */
  @Get(':id')
  async getItemById(@Param('id') id: ID): Promise<T> {
    const item = await this.service.findById(id, this.ownerRelations);
    if (!item) {
      throw new NotFoundException(`Item with id ${id} not found`);
    }
    return item;
  }

  /**
   * Create a new item.
   * Requires Create permission on the entity.
   */
  @Post()
  createItem(@Body() itemData: DeepPartial<T>): Promise<DeepPartial<T>> {
    return this.service.create(itemData);
  }

  /**
   * Delete an item by ID.
   * Requires Delete permission on the entity.
   * Automatically loads ownerRelations for CASL permission checks.
   */
  @Delete(":id")
  async deleteItem(@Param('id') id: ID): Promise<DeleteResult> {
    const itemToDelete = await this.service.findById(id, this.ownerRelations);
    if (!itemToDelete) {
      throw new NotFoundException(`Item with id ${id} not found`);
    }
    return this.service.delete(id);
  }

  /**
   * Update an item by ID.
   * Requires Update permission on the entity.
   * Automatically loads ownerRelations for CASL permission checks.
   */
  @Patch(':id')
  async updateItem(@Param('id') id: ID, @Body() updateData: QueryDeepPartialEntity<T>): Promise<UpdateResult> {
    const itemToUpdate = await this.service.findById(id, this.ownerRelations);
    if (!itemToUpdate) {
      throw new NotFoundException(`Item with id ${id} not found`);
    }
    return this.service.update(id, updateData);
  }
}
