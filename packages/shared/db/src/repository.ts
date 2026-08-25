import * as z from "zod";
import { Retailer, Category, Product } from "@grocery-tracker/domain-model";

export const UnitSchema = z.union([
  z.literal("Each"), z.literal("Kg"), z.literal("g"), z.literal("L"), z.literal("mL"), z.literal("SS"), z.literal("sheets"), z.literal("m"), z.literal("kgM")
])
export type Unit = z.infer<typeof UnitSchema>

export const ValueAtTimeSchema = z.union([
  z.object({
    unitPrice: z.number(),
    unitPriceQuantity: z.number(),
    unitPriceUnit: UnitSchema,

    size: z.string(),
    price: z.number()
  }),
  z.object({
    size: z.string(),
    price: z.number()
  })
])
export type ValueAtTime = z.infer<typeof ValueAtTimeSchema>;

export const ProductSchema = z.object({
  retailerProductId: z.string(),

  crossRetailerId: z.string().optional(),
  gtinFormat: z.number().optional(),

  currentValue: ValueAtTimeSchema,

  name: z.string(),
  brand: z.string().optional(),
  path: z.string(),
  description: z.string(),
  image_url: z.string().optional(),
});
export const ProductsSchema = z.array(ProductSchema);

export type ProductId = number;

export interface ProductRepository {
  createOrUpdate(product: Product): Promise<Product>;
};

export interface CategoryRepository {
  createOrUpdate(category: Category): Promise<Category>;
};

export interface RetailerRepository {
  createOrUpdate(retailer: Retailer): Promise<Retailer>;
};
