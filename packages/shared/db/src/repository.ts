import { Retailer, Category, Product, ValueAtTime } from "@grocery-tracker/domain-model";

export type Range = [number, number];

export type SearchableKeyOfProduct = Exclude<keyof Product, "currentValue" | "uid" | "category">;

export function isRangeType(range: [number, number]): range is Range {
  if (range[0] <= range[1]) {
    return true;
  }
  return false;
}

export type TimeRange = [Date, Date];

export function isTimeRangeType(range: [Date, Date]): range is TimeRange {
  if (range[0] <= range[1]) {
    return true;
  }
  return false;
}

export interface ProductRepository {
  createOrUpdate(product: Product): Promise<Product>;
  findBy<K extends SearchableKeyOfProduct>(
    filter: {
      key: K, 
      value: Product[K]
    }[] | {
      key: K,
      value: Product[K]
    }, 
    range?: Range
  ): Promise<Product[]>;
  findSimilarBy<K extends SearchableKeyOfProduct>(
    filter: {
      key: K, 
      value: Product[K]
    }[] | {
      key: K,
      value: Product[K]
    }, 
    range?: Range
  ): Promise<Product[]>;

  findWithPriceHistory(productId: number, timeRange?: Range): Promise<{
    product: Product,
    history: ValueAtTime[]
  }>;
};

export interface CategoryRepository {
  createOrUpdate(category: Category): Promise<Category>;

  findBy<K extends keyof Category>(key: K, value: Category[K], limit?: number): Promise<Category[]>;
  findSimilarBy<K extends keyof Category>(key: K, value: Category[K], limit?: number): Promise<Category[]>;
};

export interface RetailerRepository {
  createOrUpdate(retailer: Retailer): Promise<Retailer>;
};
