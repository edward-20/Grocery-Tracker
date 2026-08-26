import { Retailer, Category, Product } from "@grocery-tracker/domain-model";

export interface ProductRepository {
  createOrUpdate(product: Product): Promise<Product>;
  findBy<K extends Exclude<keyof Product, "currentValue" | "uid" | "category">>(key: K, value: Product[K], limit?: number): Promise<Product[]>;
  findSimilarBy<K extends Exclude<keyof Product, "currentValue" | "uid" | "category">>(key: K, value: Product[K], limit?: number): Promise<Product[]>;
};

export interface CategoryRepository {
  createOrUpdate(category: Category): Promise<Category>;
  findBy<K extends keyof Category>(key: K, value: Category[K], limit?: number): Promise<Category[]>;
  findSimilarBy<K extends keyof Category>(key: K, value: Category[K], limit?: number): Promise<Category[]>;
};

export interface RetailerRepository {
  createOrUpdate(retailer: Retailer): Promise<Retailer>;
};
