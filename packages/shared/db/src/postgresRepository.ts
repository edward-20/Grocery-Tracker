import { Pool, PoolClient, QueryResult } from "pg";
import {
  RetailerRepository,
  CategoryRepository,
  ProductRepository,
  Range,
  SearchableKeyOfProduct,
} from "./repository.js";
import {
  Retailer,
  Category,
  Product,
  ValueAtTime,
  UnitOfMeasurement,
  isCrossProductIdentity,
} from "@grocery-tracker/domain-model";

type CrossRetailerId =
  | {
      cross_retailer_id: string;
      gtin_format: number;
    }
  | {
      cross_retailer_id: null;
      gtin_format: null;
    };

type ProductRow = {
  retailer_id: number;
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
  unit_price_unit_of_measurement: UnitOfMeasurement | null;

  size: string;
  price: number;
};

type RetailerRow = {
  id: number;
  name: string;
  url: string;
};

type CategoryRow = {
  retailer_id: number;
  path: string;
  id: number;
  retailer_designated_category_id: string;
  name: string;
};

type SqlFilter = {
  whereClause: string;
  value: any;
};

type ProductListRow = ProductRow & {
  retailer_name: Retailer["name"];
  category_path: string;
  category_retailer_designated_category_id: string;
  category_name: string;
  value_product_id: number;
  value_time: Date;
  value_unit_price: number | null;
  value_unit_price_quantity: number | null;
  value_unit_price_unit_of_measurement: UnitOfMeasurement | null;
  value_size: string;
  value_price: number;
};

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly dbPool: Pool) {}

  private productListRowToProductEntity(productRow: ProductListRow): Product {
    const valueAtTimeRow: ValueAtTimeRow = {
      product_id: productRow.value_product_id,
      time: productRow.value_time,
      unit_price: productRow.value_unit_price,
      unit_price_quantity: productRow.value_unit_price_quantity,
      unit_price_unit_of_measurement:
        productRow.value_unit_price_unit_of_measurement,
      size: productRow.value_size,
      price: productRow.value_price,
    };

    const category: Category = {
      retailer: productRow.retailer_name,
      retailerDesignatedCategoryId:
        productRow.category_retailer_designated_category_id,
      name: productRow.category_name,
      path: productRow.category_path,
    };

    return this.productDetailsToProductEntity(
      productRow,
      valueAtTimeRow,
      productRow.retailer_name,
      category,
    );
  }

  private productDetailsToProductEntity(
    productRow: ProductRow,
    valueAtTimeRow: ValueAtTimeRow,
    retailer: Retailer["name"],
    category: Category,
  ): Product {
    if (
      valueAtTimeRow.unit_price &&
      valueAtTimeRow.unit_price_quantity &&
      valueAtTimeRow.unit_price_unit_of_measurement
    ) {
      return new Product({
        retailer,
        retailerProductId: productRow.retailer_product_id,
        category,
        currentValue: new ValueAtTime(
          valueAtTimeRow.size,
          valueAtTimeRow.price,
          valueAtTimeRow.time,
          {
            unitPrice: valueAtTimeRow.unit_price,
            unitPriceQuantity: valueAtTimeRow.unit_price_quantity,
            unitPriceUnitofMeasurement:
              valueAtTimeRow.unit_price_unit_of_measurement as UnitOfMeasurement,
          },
        ),
        name: productRow.name,
        path: productRow.path,
        description: productRow.description,
        brand: productRow.brand ?? undefined,
        imageUrl: productRow.image_url ?? undefined,
        crossProductIdentity: productRow.cross_retailer_id
          ? {
              crossRetailerId: productRow.cross_retailer_id,
              gtinFormat: productRow.gtin_format,
            }
          : undefined,
      });
    }
    return new Product({
      retailer,
      retailerProductId: productRow.retailer_product_id,
      category,
      currentValue: new ValueAtTime(
        valueAtTimeRow.size,
        valueAtTimeRow.price,
        valueAtTimeRow.time,
      ),
      name: productRow.name,
      path: productRow.path,
      description: productRow.description,
      brand: productRow.brand ?? undefined,
      imageUrl: productRow.image_url ?? undefined,
      crossProductIdentity: productRow.cross_retailer_id
        ? {
            crossRetailerId: productRow.cross_retailer_id,
            gtinFormat: productRow.gtin_format,
          }
        : undefined,
    });
  }

  private async productRowToProductEntity(
    productRow: ProductRow,
    valueAtTimeRow: ValueAtTimeRow,
    existingClient?: PoolClient,
  ): Promise<Product> {
    const client = existingClient ?? (await this.dbPool.connect());
    try {
      // find out the retailer from the retailerId
      const retailer = (
        await client.query("SELECT name FROM retailers WHERE id = $1", [
          productRow.retailer_id,
        ])
      ).rows[0].name;

      // find out the category from the product_categories
      const categoryRow: CategoryRow = (
        await client.query(
          `
        SELECT * FROM categories WHERE id = (SELECT category_id FROM product_categories WHERE product_id = $1 LIMIT 1);
      `,
          [productRow.id],
        )
      ).rows[0];

      const category: Category = {
        retailer,
        retailerDesignatedCategoryId:
          categoryRow.retailer_designated_category_id,
        name: categoryRow.name,
        path: categoryRow.path,
      };
      return this.productDetailsToProductEntity(
        productRow,
        valueAtTimeRow,
        retailer,
        category,
      );
    } catch (error) {
      throw error;
    } finally {
      if (!existingClient) client.release();
    }
  }

  private valueAtTimeRowToValueAtTimeEntity(
    valueAtTimeRow: ValueAtTimeRow,
  ): ValueAtTime {
    return {
      size: valueAtTimeRow.size,
      price: valueAtTimeRow.price,
      time: valueAtTimeRow.time,
      unitPricing:
        valueAtTimeRow.unit_price &&
        valueAtTimeRow.unit_price_quantity &&
        valueAtTimeRow.unit_price_unit_of_measurement
          ? {
              unitPrice: valueAtTimeRow.unit_price,
              unitPriceQuantity: valueAtTimeRow.unit_price_quantity,
              unitPriceUnitofMeasurement:
                valueAtTimeRow.unit_price_unit_of_measurement,
            }
          : undefined,
    };
  }

  async createOrUpdate(product: Product): Promise<Product> {
    const client = await this.dbPool.connect();

    try {
      await client.query("BEGIN;");
      const retailerRes = await client.query(
        "SELECT id FROM retailers WHERE name = $1;",
        [product.retailer],
      );
      const retailerId = retailerRes.rows[0].id;

      const productRes = await client.query(
        `INSERT INTO products (
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
      RETURNING *;`,
        [
          retailerId,
          product.retailerProductId,
          product.crossProductIdentity?.crossRetailerId,
          product.crossProductIdentity?.gtinFormat,
          product.name,
          product.brand,
          product.path,
          product.description,
          product.imageUrl,
        ],
      );

      const productId = productRes.rows[0].id;

      // upsert into the value_at_time
      const valueAtTimeRes = await client.query(
        `INSERT INTO value_at_times (
        product_id,
        time,
        unit_price,
        unit_price_quantity,
        unit_price_unit_of_measurement,
        size,
        price
      ) VALUES ( $1, $2, $3, $4, $5, $6, $7 ) RETURNING *;`,
        [
          productId,
          new Date(),
          product.currentValue.unitPricing?.unitPrice,
          product.currentValue.unitPricing?.unitPriceQuantity,
          product.currentValue.unitPricing?.unitPriceUnitofMeasurement,
          product.currentValue.size,
          product.currentValue.price,
        ],
      );

      // find the category id (or should we create the category if it doesn't exist)
      const categoryRes = await client.query(
        "SELECT id FROM categories WHERE retailer_id = $1 AND path = $2",
        [retailerId, product.category.path],
      );
      let categoryId: number;
      if (categoryRes.rowCount === 0) {
        // create a category
        categoryId = (
          await client.query(
            `INSERT INTO categories (retailer_id, path, retailer_designated_category_id, name)
          VALUES ($1, $2, $3, $4) RETURNING id;`,
            [
              retailerId,
              product.category.path,
              product.category.retailerDesignatedCategoryId,
              product.category.name,
            ],
          )
        ).rows[0].id;
      } else {
        categoryId = categoryRes.rows[0].id;
      }

      // upsert into product_categories
      await client.query(
        `INSERT INTO product_categories (
        product_id,
        category_id
      ) VALUES ( $1, $2 ) ON CONFLICT (product_id, category_id) DO NOTHING RETURNING *;`,
        [productId, categoryId],
      );

      await client.query("COMMIT;");
      client.release();
      return this.productRowToProductEntity(
        productRes.rows[0],
        valueAtTimeRes.rows[0],
      );
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw new Error("Failed to create product", { cause: error });
    }
  }

  private async filtersToSqlConditions<K extends SearchableKeyOfProduct>(
    client: PoolClient,
    filters: { key: K; value: Product[K] }[],
    similar: boolean,
  ): Promise<SqlFilter[]> {
    const sqlFilters: SqlFilter[] = [];

    let i = 1;
    for (const filter of filters) {
      // Retailer
      if (filter.key === "retailer") {
        const retailerRes = await client.query(
          "SELECT id FROM retailers WHERE name = $1",
          [filter.value],
        );
        if (retailerRes.rowCount !== 1) {
          throw new Error(
            `Couldn't find the retailer asked for from findBy: ${filter.value}`,
          );
        }
        const retailer_id = retailerRes.rows[0].id;
        sqlFilters.push({
          whereClause: `retailer_id = \$${i}`,
          value: retailer_id,
        });
        i++;
      }
      // Cross Product Identity
      else if (filter.key === "crossProductIdentity") {
        if (isCrossProductIdentity(filter.value)) {
          const similarSqlFilters = [
            {
              whereClause: `gtin_format = \$${i}`,
              value: filter.value.gtinFormat,
            },
            {
              whereClause: `cross_retailer_id ILIKE \$${i + 1}`,
              value: `%${filter.value.crossRetailerId}%`,
            },
          ];
          const notSimilarSqlFilters = [
            {
              whereClause: `gtin_format = \$${i}`,
              value: filter.value.gtinFormat,
            },
            {
              whereClause: `cross_retailer_id = \$${i + 1}`,
              value: filter.value.crossRetailerId,
            },
          ];
          if (similar) sqlFilters.push(...similarSqlFilters);
          else sqlFilters.push(...notSimilarSqlFilters);
          i += 2;
        } else {
          throw `Provided key: crossProductIdentity but value: ${filter.value} not CrossProductIdentity to ProductRepository findBy`;
        }
      }
      // Image Url
      else if (filter.key === "imageUrl") {
        const similarSqlFilters = {
          whereClause: `image_url ILIKE \$${i}`,
          value: `%${filter.value}%`,
        };
        const notSimilarSqlFilters = {
          whereClause: `image_url = \$${i}`,
          value: filter.value,
        };
        if (similar) sqlFilters.push(similarSqlFilters);
        else sqlFilters.push(notSimilarSqlFilters);
        i++;
      }
      // Retailer Product Id
      else if (filter.key === "retailerProductId") {
        const similarSqlFilters = {
          whereClause: `retailer_product_id ILIKE \$${i}`,
          value: `%${filter.value}%`,
        };
        const notSimilarSqlFilters = {
          whereClause: `retailer_product_id = \$${i}`,
          value: filter.value,
        };
        if (similar) sqlFilters.push(similarSqlFilters);
        else sqlFilters.push(notSimilarSqlFilters);
        i++;
      }
      // Any other property
      else {
        if (
          filter.key !== "brand" &&
          filter.key !== "name" &&
          filter.key !== "path" &&
          filter.key !== "description"
        ) {
          throw `Provided key: ${filter.key} doesn't fit into searchable product key constraints`;
        }
        const similarSqlFilters = {
          whereClause: `${filter.key} ILIKE \$${i}`,
          value: `%${filter.value}%`,
        };
        const notSimilarSqlFilters = {
          whereClause: `${filter.key} = \$${i}`,
          value: filter.value,
        };
        if (similar) sqlFilters.push(similarSqlFilters);
        else sqlFilters.push(notSimilarSqlFilters);
        i++;
      }
    }
    return sqlFilters;
  }

  private async findProductList(
    client: PoolClient,
    productQuery: string,
    values: unknown[],
  ): Promise<Product[]> {
    const productsRes = await client.query<ProductListRow>(
      `
      WITH filtered_products AS (
        ${productQuery}
      )
      SELECT
        products.*,
        retailers.name AS retailer_name,
        categories.path AS category_path,
        categories.retailer_designated_category_id AS category_retailer_designated_category_id,
        categories.name AS category_name,
        current_values.product_id AS value_product_id,
        current_values.time AS value_time,
        current_values.unit_price AS value_unit_price,
        current_values.unit_price_quantity AS value_unit_price_quantity,
        current_values.unit_price_unit_of_measurement AS value_unit_price_unit_of_measurement,
        current_values.size AS value_size,
        current_values.price AS value_price
      FROM filtered_products AS products
      INNER JOIN retailers ON retailers.id = products.retailer_id
      INNER JOIN LATERAL (
        SELECT categories.*
        FROM product_categories
        INNER JOIN categories ON categories.id = product_categories.category_id
        WHERE product_categories.product_id = products.id
        LIMIT 1
      ) AS categories ON true
      INNER JOIN LATERAL (
        SELECT *
        FROM value_at_times
        WHERE product_id = products.id
        ORDER BY time DESC
        LIMIT 1
      ) AS current_values ON true;
    `,
      values,
    );

    return productsRes.rows.map((productRow) =>
      this.productListRowToProductEntity(productRow),
    );
  }

  async findBy<K extends SearchableKeyOfProduct>(
    filter: { key: K; value: Product[K] }[] | { key: K; value: Product[K] },
    range?: Range,
  ): Promise<Product[]> {
    const client = await this.dbPool.connect();
    try {
      let arrayFilter;
      if (!Array.isArray(filter)) {
        arrayFilter = [filter];
      } else {
        arrayFilter = filter;
      }

      const sqlConditions: SqlFilter[] = await this.filtersToSqlConditions(
        client,
        arrayFilter,
        false,
      );

      const query = range
        ? `
        SELECT *
        FROM products
        ${sqlConditions.length === 0 ? "" : "WHERE"} ${sqlConditions.map((sqlFilter) => sqlFilter.whereClause).join(" AND ")}
        OFFSET ${range[0]}
        LIMIT ${range[1] - range[0] + 1}
      `
        : `
        SELECT *
        FROM products
        ${sqlConditions.length === 0 ? "" : "WHERE"} ${sqlConditions.map((sqlFilter) => sqlFilter.whereClause).join(" AND ")}
      `;

      return this.findProductList(
        client,
        query,
        sqlConditions.map((sqlFilter) => sqlFilter.value),
      );
    } catch (error) {
      throw new Error("Failed to find products", { cause: error });
    } finally {
      client.release();
    }
  }

  async findSimilarBy<K extends SearchableKeyOfProduct>(
    filter: { key: K; value: Product[K] }[] | { key: K; value: Product[K] },
    range?: Range,
  ): Promise<Product[]> {
    const client = await this.dbPool.connect();
    try {
      let arrayFilter;
      if (!Array.isArray(filter)) {
        arrayFilter = [filter];
      } else {
        arrayFilter = filter;
      }

      const sqlConditions: SqlFilter[] = await this.filtersToSqlConditions(
        client,
        arrayFilter,
        true,
      );

      const query = range
        ? `
        SELECT *
        FROM products
        ${sqlConditions.length === 0 ? "" : "WHERE"} ${sqlConditions.map((sqlFilter) => sqlFilter.whereClause).join(" AND ")}
        OFFSET ${range[0]}
        LIMIT ${range[1] - range[0] + 1}
      `
        : `
        SELECT *
        FROM products
        ${sqlConditions.length === 0 ? "" : "WHERE"} ${sqlConditions.map((sqlFilter) => sqlFilter.whereClause).join(" AND ")}
      `;

      return this.findProductList(
        client,
        query,
        sqlConditions.map((sqlFilter) => sqlFilter.value),
      );
    } catch (error) {
      console.error(error);
      throw new Error("Failed to find products", { cause: error });
    } finally {
      client.release();
    }
  }

  async findWithPriceHistory(
    retailer: Retailer["name"],
    retailerProductId: Product["retailerProductId"],
    timeRange?: Range,
  ): Promise<{ product: Product; history: ValueAtTime[] }> {
    const client = await this.dbPool.connect();
    try {
      let productRes: QueryResult<any>;

      const retailerId = (
        await client.query("SELECT id FROM retailers WHERE name = $1;", [
          retailer,
        ])
      ).rows[0].id;

      productRes = await client.query(
        `SELECT * FROM products WHERE retailer_id = $1 AND retailer_product_id = $2`,
        [retailerId, retailerProductId],
      );
      if (productRes.rowCount !== 1) {
        throw new Error("Unexpectedly returned more than one product");
      }
      const productRow = productRes.rows[0];
      const productId = productRow.id;
      // find all the value rows within the time range for the product
      const valueAtTimesRes = timeRange
        ? await client.query(
            `SELECT * FROM value_at_times WHERE product_id = $1 WHERE TIME BETWEEN $2 AND $3 ORDER BY time DESC`,
            [productId, timeRange[0], timeRange[1]],
          )
        : await client.query(
            `SELECT * FROM value_at_times WHERE product_id = $1 ORDER BY time DESC`,
            [productId],
          );

      // fint the most recent value_at_times row
      const mostRecentValueAtTimeRes = await client.query(
        `SELECT * FROM value_at_times WHERE product_id = $1 ORDER BY time DESC LIMIT 1`,
        [productId],
      );
      if (mostRecentValueAtTimeRes.rowCount !== 1) {
        throw `Couldn't get the latest value for product ${productId}`;
      }

      const product = await this.productRowToProductEntity(
        productRow,
        mostRecentValueAtTimeRes.rows[0],
        client,
      );
      return {
        product,
        history: valueAtTimesRes.rows.map((valueAtTimeRow) =>
          this.valueAtTimeRowToValueAtTimeEntity(valueAtTimeRow),
        ),
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to find products", { cause: error });
    } finally {
      client.release();
    }
  }

  async countBy<K extends SearchableKeyOfProduct>(
    filter: { key: K; value: Product[K] }[] | { key: K; value: Product[K] },
  ): Promise<number> {
    const client = await this.dbPool.connect();
    try {
      let arrayFilter;
      if (!Array.isArray(filter)) {
        arrayFilter = [filter];
      } else {
        arrayFilter = filter;
      }

      const sqlConditions: SqlFilter[] = await this.filtersToSqlConditions(
        client,
        arrayFilter,
        false,
      );

      let productsRes: QueryResult<any>;

      const query = `
        SELECT COUNT(*)
        FROM products
        ${sqlConditions.length === 0 ? "" : "WHERE"} ${sqlConditions.map((sqlFilter) => sqlFilter.whereClause).join(" AND ")}`;

      productsRes = await client.query(
        query,
        sqlConditions.map((sqlFilter) => sqlFilter.value),
      );

      return productsRes.rows[0].count;
    } catch (error) {
      throw new Error("Failed to find products", { cause: error });
    } finally {
      client.release();
    }
  }

  async countSimilarBy<K extends SearchableKeyOfProduct>(
    filter: { key: K; value: Product[K] }[] | { key: K; value: Product[K] },
  ): Promise<number> {
    const client = await this.dbPool.connect();
    try {
      let arrayFilter;
      if (!Array.isArray(filter)) {
        arrayFilter = [filter];
      } else {
        arrayFilter = filter;
      }

      const sqlConditions: SqlFilter[] = await this.filtersToSqlConditions(
        client,
        arrayFilter,
        true,
      );

      let productsRes: QueryResult<any>;

      const query = `
        SELECT COUNT(*)
        FROM products
        ${sqlConditions.length === 0 ? "" : "WHERE"} ${sqlConditions.map((sqlFilter) => sqlFilter.whereClause).join(" AND ")}`;

      productsRes = await client.query(
        query,
        sqlConditions.map((sqlFilter) => sqlFilter.value),
      );

      return productsRes.rows[0].count;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to find products", { cause: error });
    } finally {
      client.release();
    }
  }
}

export class PostgresCategoryRepository implements CategoryRepository {
  constructor(private readonly dbPool: Pool) {}
  private async categoryRowToCategoryEntity(
    categoryRow: CategoryRow,
  ): Promise<Category> {
    // find the retailer name
    const client = await this.dbPool.connect();
    try {
      const retailerRes = await client.query(
        "SELECT name FROM retailers WHERE id = $1;",
        [categoryRow.retailer_id],
      );
      const retailer = retailerRes.rows[0].name;

      return {
        retailer: retailer,
        retailerDesignatedCategoryId:
          categoryRow.retailer_designated_category_id,
        name: categoryRow.name,
        path: categoryRow.path,
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async createOrUpdate(category: Category): Promise<Category> {
    const client = await this.dbPool.connect();

    try {
      await client.query("BEGIN;");

      const retailerId = (
        await client.query("SELECT id FROM retailers WHERE name = $1;", [
          category.retailer,
        ])
      ).rows[0].id;
      const categoryRes = await client.query(
        `INSERT INTO categories (
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
      RETURNING *;`,
        [
          retailerId,
          category.path,
          category.retailerDesignatedCategoryId,
          category.name,
        ],
      );

      await client.query("COMMIT;");
      client.release();
      return this.categoryRowToCategoryEntity(categoryRes.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw new Error("Failed to create product", { cause: error });
    }
  }

  async findBy<K extends keyof Category>(
    key: K,
    value: Category[K],
    limit?: number,
  ): Promise<Category[]> {
    const client = await this.dbPool.connect();

    try {
      let field:
        "retailer_id" | "path" | "retailer_designated_category_id" | "name";

      switch (key) {
        case "name":
        case "path":
          field = key;
          break;
        case "retailer":
          field = "retailer_id";
          break;
        case "retailerDesignatedCategoryId":
          field = "retailer_designated_category_id";
          break;
        default:
          throw new Error(
            `Provided a non-valid key to the repository findBy method: ${key}`,
          );
      }

      let retailer_id;
      if (field === "retailer_id") {
        const retailerRes = await client.query(
          "SELECT id FROM retailers WHERE name = $1",
          [value],
        );
        if (retailerRes.rowCount !== 1) {
          throw new Error(
            `Couldn't find the retailer asked for from findBy: ${value}`,
          );
        }
        retailer_id = retailerRes.rows[0].id;
      }

      const categoriesRes = await client.query(
        `SELECT * FROM categories WHERE ${field} = $1 LIMIT $2`,
        [field === "retailer_id" ? retailer_id : value, limit ?? 10],
      );

      const categoryRows = categoriesRes.rows;

      return Promise.all(
        categoryRows.map(async (categoryRow: CategoryRow) => {
          return await this.categoryRowToCategoryEntity(categoryRow);
        }),
      );
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async findSimilarBy<K extends keyof Category>(
    key: K,
    value: Category[K],
    limit?: number,
  ): Promise<Category[]> {
    const client = await this.dbPool.connect();

    try {
      let field:
        "retailer_id" | "path" | "retailer_designated_category_id" | "name";

      switch (key) {
        case "name":
        case "path":
          field = key;
          break;
        case "retailer":
          field = "retailer_id";
          break;
        case "retailerDesignatedCategoryId":
          field = "retailer_designated_category_id";
          break;
        default:
          throw new Error(
            `Provided a non-valid key to the repository findBy method: ${key}`,
          );
      }

      let retailer_id;
      if (field === "retailer_id") {
        const retailerRes = await client.query(
          "SELECT id FROM retailers WHERE name = $1",
          [value],
        );
        if (retailerRes.rowCount !== 1) {
          throw new Error(
            `Couldn't find the retailer asked for from findBy: ${value}`,
          );
        }
        retailer_id = retailerRes.rows[0].id;
      }

      // if its retailer, then there's no similar look up, otherwise can you ilike
      let categoriesRes;
      if (field === "retailer_id") {
        categoriesRes = await client.query(
          `SELECT * FROM categories WHERE retailer_id = $1 LIMIT $2`,
          [retailer_id, limit ?? 10],
        );
      } else {
        categoriesRes = await client.query(
          `SELECT * FROM categories WHERE ${field} ILIKE $1 LIMIT $2`,
          [value, limit ?? 10],
        );
      }

      const categoryRows: CategoryRow[] = categoriesRes.rows;

      return Promise.all(
        categoryRows.map(async (categoryRow: CategoryRow) => {
          return await this.categoryRowToCategoryEntity(categoryRow);
        }),
      );
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}

export class PostgresRetailerRepository implements RetailerRepository {
  constructor(private readonly dbPool: Pool) {}
  private retailerRowToRetailerEntity(retailerRow: RetailerRow): Retailer {
    return {
      name: retailerRow.name as "Woolworths" | "Coles",
      url: retailerRow.url,
    };
  }
  async createOrUpdate(retailer: Retailer): Promise<Retailer> {
    const client = await this.dbPool.connect();

    try {
      await client.query("BEGIN;");
      const retailerSelect = await client.query(
        `SELECT * FROM retailers WHERE name = $1 AND url = $2;`,
        [retailer.name, retailer.url],
      );
      let retailerRes;
      if (retailerSelect.rowCount !== 1) {
        retailerRes = await client.query(
          `INSERT INTO retailers (
          name, 
          url
        ) VALUES ( $1, $2 ) 
        RETURNING *;`,
          [retailer.name, retailer.url],
        );
      } else {
        retailerRes = retailerSelect;
      }
      await client.query("COMMIT;");
      return this.retailerRowToRetailerEntity(retailerRes.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error("Failed to create retailer", { cause: error });
    } finally {
      client.release();
    }
  }
}
