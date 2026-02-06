export interface FilterOptionsInterface {
  where? : any;
  relations?: string[];
  like?: any;
  select?: any;
  order?: { [key: string]: 'ASC' | 'DESC' };
}

export interface PaginationOptionsInterface extends FilterOptionsInterface {
  page: number;
  limit: number;
}
