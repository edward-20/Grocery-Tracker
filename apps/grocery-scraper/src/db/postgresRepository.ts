import { Pool } from "pg";
import { RetailerRepository, CategoryRepository, ProductRepository } from "./repository.js";
import { Retailer, Category, Product, ValueAtTime, UnitOfMeasurement } from "../entities.js";

type CrossRetailerId = {
  cross_retailer_id: string;
  gtin_format: number;
} | {
  cross_retailer_id: null;
  gtin_format: null;
}

type ProductRow = {
  retailer_id: number
  retailer_product_id: string;
  id: number;
  name: string;
  brand: string | null;
  path: string;
  description: string;
  image_url: string | null;
} & CrossRetailerId;

type ValueAtTimeRow = {
  product_id: number;
  time: Date;

  unit_price: number | null;
  unit_price_quantity: number | null;
  unit_price_unit_of_measurement: string | null;

  size: string;
  price: number;

}

type RetailerRow = {
  id: number;
  name: string;
  url: string;
}

type CategoryRow = {
  retailer_id: number;
  path: string;
  id: number;
  retailer_designated_category_id: string;
  name: string;
}

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly dbPool: Pool) {}

  private async productRowToProductEntity(productRow: ProductRow, valueAtTimeRow: ValueAtTimeRow): Promise<Product> { 
    const client = await this.dbPool.connect();
    try {
      // find out the retailer from the retailerId
      const retailer = (await client.query("SELECT name FROM retailers WHERE id = $1", [productRow.retailer_id])).rows[0].name;

      // find out the category from the product_categories
      const categoryRow: CategoryRow = (await client.query(`
        SELECT * FROM categories WHERE id = (SELECT category_id FROM product_categories WHERE product_id = $1 LIMIT 1);
      `, [productRow.id])).rows[0];

      // create a category from categoryRow
      const category: Category = {
        retailer,
        retailerDesignatedCategoryId: categoryRow.retailer_designated_category_id,
        name: categoryRow.name,
        path: categoryRow.path
      };

      if (valueAtTimeRow.unit_price && valueAtTimeRow.unit_price_quantity && valueAtTimeRow.unit_price_unit_of_measurement) {
        client.release();
        return new Product({
          retailer,
          retailerProductId: productRow.retailer_product_id,
          category,
          currentValue: new ValueAtTime(valueAtTimeRow.size, valueAtTimeRow.price, valueAtTimeRow.time, {
            unitPrice: valueAtTimeRow.unit_price,
            unitPriceQuantity: valueAtTimeRow.unit_price_quantity,
            unitPriceUnitofMeasurement: valueAtTimeRow.unit_price_unit_of_measurement as UnitOfMeasurement
          }),
          name: productRow.name,
          path: productRow.path,
          description: productRow.description,
          brand: productRow.brand ?? undefined,
          imageUrl: productRow.image_url ?? undefined,
          crossProductIdentity: productRow.cross_retailer_id ? {
            crossRetailerId: productRow.cross_retailer_id,
            gtinFormat: productRow.gtin_format,
          } : undefined
        });
      }
      client.release();
      return new Product({
        retailer,
        retailerProductId: productRow.retailer_product_id,
        category,
        currentValue: new ValueAtTime(valueAtTimeRow.size, valueAtTimeRow.price, valueAtTimeRow.time),
        name: productRow.name,
        path: productRow.path,
        description: productRow.description,
        brand: productRow.brand ?? undefined,
        imageUrl: productRow.image_url ?? undefined,
        crossProductIdentity: productRow.cross_retailer_id ? {
          crossRetailerId: productRow.cross_retailer_id,
          gtinFormat: productRow.gtin_format
        } : undefined
      })
    } catch (error) {
      client.release();
      throw error;
    }
  };

  async createOrUpdate(
    product: Product 
  ): Promise<Product> {
    const client = await this.dbPool.connect();

    try {
      await client.query("BEGIN;");
      const retailerRes = await client.query("SELECT id FROM retailers WHERE name = $1;", [product.retailer]);
      const retailerId = retailerRes.rows[0].id;

      const productRes = await client.query(`INSERT INTO products (
        retailer_id,
        retailer_product_id,
        cross_retailer_id,
        gtin_format,
        name,
        brand,
        path,
        description,
        image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (retailer_id, retailer_product_id)
      DO UPDATE SET
        cross_retailer_id = EXCLUDED.cross_retailer_id,
        gtin_format = EXCLUDED.gtin_format,
        name = EXCLUDED.name,
        brand = EXCLUDED.brand,
        path = EXCLUDED.path,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url
      RETURNING *;`, [
        retailerId,
        product.retailerProductId,
        product.crossProductIdentity?.crossRetailerId,
        product.crossProductIdentity?.gtinFormat,
        product.name,
        product.brand,
        product.path,
        product.description,
        product.imageUrl
      ]);

      const productId = productRes.rows[0].id;

      // upsert into the value_at_time
      const valueAtTimeRes = await client.query(`INSERT INTO value_at_times (
        product_id,
        time,
        unit_price,
        unit_price_quantity,
        unit_price_unit_of_measurement,
        size,
        price
      ) VALUES ( $1, $2, $3, $4, $5, $6, $7 ) RETURNING *;`, [
          productId,
          new Date(),
          product.currentValue.unitPricing?.unitPrice,
          product.currentValue.unitPricing?.unitPriceQuantity,
          product.currentValue.unitPricing?.unitPriceUnitofMeasurement,
          product.currentValue.size,
          product.currentValue.price
      ]);

      // find the category id (or should we create the category if it doesn't exist)
      const categoryRes = await client.query("SELECT id FROM categories WHERE retailer_id = $1 AND path = $2", [retailerId, product.category.path])
      let categoryId: number; 
      if (categoryRes.rowCount === 0) {
        // create a category
        categoryId = (await client.query(`INSERT INTO categories (retailer_id, path, retailer_designated_category_id, name) 
          VALUES ($1, $2, $3, $4) RETURNING id;`, [
            retailerId, product.category.path, product.category.retailerDesignatedCategoryId, product.category.name
          ])).rows[0].id;
      } else {
        categoryId = categoryRes.rows[0].id;
      }

      // upsert into product_categories
      await client.query(`INSERT INTO product_categories (
        product_id,
        category_id
      ) VALUES ( $1, $2 ) ON CONFLICT (product_id, category_id) DO NOTHING RETURNING *;`, [
        productId,
        categoryId
      ]);
      
      await client.query("COMMIT;");
      client.release()
      return this.productRowToProductEntity(productRes.rows[0], valueAtTimeRes.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw new Error("Failed to create product", {cause: error});
    }
  }
}

export class PostgresCategoryRepository implements CategoryRepository {
  constructor(private readonly dbPool: Pool) {}
  private async categoryRowToCategoryEntity(categoryRow: CategoryRow): Promise<Category> {
    // find the retailer name
    const client = await this.dbPool.connect();
    try {
      const retailerRes = await client.query("SELECT name FROM retailers WHERE id = $1;", [categoryRow.retailer_id]);
      const retailer = retailerRes.rows[0].name;

      client.release();
      return {
        retailer: retailer,
        retailerDesignatedCategoryId: categoryRow.retailer_designated_category_id,
        name: categoryRow.name,
        path: categoryRow.path,
      }
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async createOrUpdate(category: Category): Promise<Category> {
    const client = await this.dbPool.connect();

    try {
      await client.query("BEGIN;");

      const retailerId = (await client.query("SELECT id FROM retailers WHERE name = $1;", [category.retailer])).rows[0].id;
      const categoryRes = await client.query(`INSERT INTO categories (
        retailer_id, 
        path,
        retailer_designated_category_id,
        name
      ) VALUES (
        $1, $2, $3, $4
      ) ON CONFLICT (retailer_id, path) 
      DO UPDATE SET
        retailer_designated_category_id = EXCLUDED.retailer_designated_category_id,
        name = EXCLUDED.name
      RETURNING *;`, [
        retailerId,
        category.path,
        category.retailerDesignatedCategoryId,
        category.name
      ]);

      await client.query("COMMIT;");
      client.release();
      return this.categoryRowToCategoryEntity(categoryRes.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw new Error("Failed to create product", { cause: error });
    }
  }
}

export class PostgresRetailerRepository implements RetailerRepository {
  constructor(private readonly dbPool: Pool) {}
  private retailerRowToRetailerEntity(retailerRow: RetailerRow): Retailer {
    return {
      name: retailerRow.name as "Woolworths" | "Coles",
      url: retailerRow.url,
    }
  }
  async createOrUpdate(retailer: Retailer): Promise<Retailer> {
    const client = await this.dbPool.connect();

    try {
      await client.query("BEGIN;");
      const retailerSelect = await client.query(`SELECT * FROM retailers WHERE name = $1 AND url = $2;`, [retailer.name, retailer.url]);
      let retailerRes;
      if (retailerSelect.rowCount !== 1) {
        retailerRes = await client.query(`INSERT INTO retailers (
          name, 
          url
        ) VALUES ( $1, $2 ) 
        RETURNING *;`, [retailer.name, retailer.url]);
      } else {
        retailerRes = retailerSelect;
      }
      await client.query("COMMIT;");
      return this.retailerRowToRetailerEntity(retailerRes.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error("Failed to create retailer", {cause: error});
    } finally {
      client.release();
    }
  }
}
