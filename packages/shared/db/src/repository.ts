import { Retailer, Category, Product } from "@grocery-tracker/domain-model";

export interface ProductRepository {
  createOrUpdate(product: Product): Promise<Product>;
};

export interface CategoryRepository {
  createOrUpdate(category: Category): Promise<Category>;
};

export interface RetailerRepository {
  createOrUpdate(retailer: Retailer): Promise<Retailer>;
};
