import type { PaginationResultInterface } from './pagination.results.interface';

export class Pagination<PaginationEntity> {
  public results: PaginationEntity[];
  public page_total: number;
  public total: number;
  public limit: number;
  public current_page: number;

  constructor(paginationResults: PaginationResultInterface<PaginationEntity>) {
    const { results, total, page, limit } = paginationResults;
    this.results = results || [];
    this.total = total || 0;
    this.limit = limit || 10; // Default limit to 10 if not provided
    this.current_page = page;
    
    // Correctly calculate total pages by dividing total items by limit and rounding up
    this.page_total = Math.ceil(this.total / this.limit);
  }
}
