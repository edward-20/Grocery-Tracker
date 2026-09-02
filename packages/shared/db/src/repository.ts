import { Retailer, Category, Product } from "@grocery-tracker/domain-model";

export type Range = [number, number];

export type SearchableKeyOfProduct = Exclude<keyof Product, "currentValue" | "uid" | "category">;

export function isRangeType(range: [number, number]): range is Range {
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
};

export interface CategoryRepository {
  createOrUpdate(category: Category): Promise<Category>;

  findBy<K extends keyof Category>(key: K, value: Category[K], limit?: number): Promise<Category[]>;
  findSimilarBy<K extends keyof Category>(key: K, value: Category[K], limit?: number): Promise<Category[]>;
};

export interface RetailerRepository {
  createOrUpdate(retailer: Retailer): Promise<Retailer>;
};
