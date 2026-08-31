import { beforeEach, afterAll, beforeAll, describe, expect, it, expectTypeOf } from "vitest";
import { CategoryRepository, ProductRepository, PostgresCategoryRepository, PostgresProductRepository } from "@grocery-tracker/db";
import { Pool } from "pg";
import { simpleCategory, productToProductRow, productToValueRow, categoriesAndTheirProducts, categoriesAndTheirProductsWithMultiplePricePoints } from "./helper.js";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { readFile } from "node:fs/promises";
import { Product } from "@grocery-tracker/domain-model";

let container: Awaited<
  ReturnType<PostgreSqlContainer["start"]>
>;
let pool: Pool;
let woolworthsRetailerId: number;
let colesRetailerId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("timescale/timescaledb:latest-pg16")
  .withDatabase("test")
  .withUsername("test")
  .withPassword("test")
  .start();

  pool = new Pool({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  });

  // take the schema.sql to initialise
  const sql = await readFile(
    new URL("../../src/schema.sql", import.meta.url),
    'utf-8'
  );
  await pool.query(sql);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  })
}, 0)

afterAll(async () => {
  await pool.end();
  await container.stop();
})

describe("CategoryRepository", () => {
  beforeEach(async () => {
    // reset database
    const client = await pool.connect();

    try {
      let res = await client.query("TRUNCATE TABLE categories CASCADE;");
      res = await client.query("TRUNCATE TABLE products CASCADE;");
      res = await client.query("TRUNCATE TABLE product_categories CASCADE;");
      res = await client.query("TRUNCATE TABLE value_at_times CASCADE;");
    } finally {
      client.release();
    }
    woolworthsRetailerId = (await client.query("SELECT id FROM retailers WHERE name = $1;", ["Woolworths"])).rows[0].id;
    colesRetailerId = (await client.query("SELECT id FROM retailers WHERE name = $1;", ["Coles"])).rows[0].id;

  }) 

  it("can create a single category", async () => {
    const categoryRepository = new PostgresCategoryRepository(pool);
    await categoryRepository.createOrUpdate(simpleCategory);

    const client = await pool.connect();

    try {
      const categoriesRes = await client.query("SELECT * FROM categories;");

      expect(categoriesRes.rowCount).toEqual(1);
      expect(categoriesRes.rows[0]).toMatchObject({
        retailer_id: woolworthsRetailerId,
        path: "/a",
        retailer_designated_category_id: "a",
        name: "a"
      })
    } finally {
      client.release();
    }
  })

  it.each(categoriesAndTheirProducts)("can create a category", async (categoryAndProducts) => {
    const categoryRepository = new PostgresCategoryRepository(pool);
    const category = categoryAndProducts.category;
    await categoryRepository.createOrUpdate(category);

    const client = await pool.connect();

    try {
      const categoriesRes = await client.query("SELECT * FROM categories;");

      expect(categoriesRes.rowCount).toEqual(1);
      expect(categoriesRes.rows[0]).toMatchObject({
        retailer_id: category.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId,
        path: category.path,
        retailer_designated_category_id: category.retailerDesignatedCategoryId,
        name: category.name
      })
    } finally {
      client.release();
    }
  })

  it.each(categoriesAndTheirProducts)("can create a category and find the result", async (categoryAndProducts) => {
    const categoryRepository = new PostgresCategoryRepository(pool);
    const category = categoryAndProducts.category;
    await categoryRepository.createOrUpdate(category);

    const categoriesRepRes = await categoryRepository.findBy("retailerDesignatedCategoryId", category.retailerDesignatedCategoryId);
    expect(categoriesRepRes).toHaveLength(1);
    expect(categoriesRepRes[0]).toMatchObject(category);
  })
})

describe("ProductRepository", () => {
  beforeEach(async () => {
    // reset database
    const client = await pool.connect();

    try {
      let res = await client.query("TRUNCATE TABLE categories CASCADE;");
      res = await client.query("TRUNCATE TABLE products CASCADE;");
      res = await client.query("TRUNCATE TABLE product_categories CASCADE;");
      res = await client.query("TRUNCATE TABLE value_at_times CASCADE;");
    } finally {
      client.release();
    }
  }) 

  it.each(categoriesAndTheirProducts)("can create a product after its category has been created", async(categoryAndProduct) => {
    const categoryRepository = new PostgresCategoryRepository(pool);
    await categoryRepository.createOrUpdate(categoryAndProduct.category);

    const productRepository: ProductRepository = new PostgresProductRepository(pool);
    
    for (const product of categoryAndProduct.products) {
      await productRepository.createOrUpdate(product);

      const client = await pool.connect();

      try {
        const productRes = await client.query(`SELECT * FROM products WHERE 
          retailer_id = $1 AND   
          retailer_product_id = $2 AND   
          cross_retailer_id IS NOT DISTINCT FROM $3 AND   
          gtin_format IS NOT DISTINCT FROM $4 AND
          name = $5 AND
          brand IS NOT DISTINCT FROM $6 AND
          path = $7 AND
          description = $8 AND
          image_url IS NOT DISTINCT FROM $9 
        ;`, [
            product.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId,
            product.retailerProductId,
            product.crossProductIdentity?.crossRetailerId,
            product.crossProductIdentity?.gtinFormat,
            product.name,
            product.brand,
            product.path,
            product.description,
            product.imageUrl
        ]);

        // check the product
        expect(productRes.rowCount).toEqual(1);
        expect(productRes.rows[0]).toEqual(expect.objectContaining({
          retailer_id: product.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId,
          ...productToProductRow(product)
        }));

        // check the product-categories many to many link
        const productId = productRes.rows[0].id;
        const categoriesRes = await client.query(`SELECT id FROM categories WHERE
          retailer_id = $1 AND
          path = $2
        ;`, [product.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId, product.category.path]) 
        expect(categoriesRes.rowCount).toEqual(1);
        const categoryId = (categoriesRes).rows[0].id;
        const productCategoriesLinkRes = await client.query(`SELECT * FROM product_categories WHERE
          product_id = $1 AND
          category_id = $2
        ;`, [productId, categoryId]);
        expect(productCategoriesLinkRes.rowCount).toEqual(1);
        expect(productCategoriesLinkRes.rows[0]).toEqual(expect.objectContaining({
          category_id: categoryId,
          product_id: productId
        }));

        // check the value_at_times
        const valueRes = await client.query("SELECT * FROM value_at_times WHERE product_id = $1;", [productId]);
        expect(valueRes.rowCount).toEqual(1);
        expect(valueRes.rows[0]).toEqual(expect.objectContaining({
          ...productToValueRow(product)
        }));
      } finally {
        client.release();
      }
    }
  })

  it.each(categoriesAndTheirProductsWithMultiplePricePoints)("can create and update the price points for a product", async (categoryAndProducts) => {
    const categoryRepository: CategoryRepository = new PostgresCategoryRepository(pool);
    categoryRepository.createOrUpdate(categoryAndProducts.category);
    const productRepository: ProductRepository = new PostgresProductRepository(pool);

    for (const rootProductAndClones of categoryAndProducts.productsAndMultiPricePoints) {
      const client = await pool.connect();
      try {
        await productRepository.createOrUpdate(rootProductAndClones.rootProduct);
        // check that the rootProduct can be found
        let productRes = await client.query(`SELECT * FROM products WHERE 
          retailer_id = $1 AND
          retailer_product_id = $2
        ;`, [rootProductAndClones.rootProduct.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId, rootProductAndClones.rootProduct.retailerProductId]);
        expect(productRes.rowCount).toEqual(1);
        expect(productRes.rows[0]).toEqual(expect.objectContaining({
          ...productToProductRow(rootProductAndClones.rootProduct)
        }));

        // insert the differentProductPricePoints
        for (const differentPricePoint of rootProductAndClones.differentPricePointProducts) {
          await productRepository.createOrUpdate(differentPricePoint);
        }

        // check that there's still only one root product
        productRes = await client.query(`SELECT * FROM products WHERE 
          retailer_id = $1 AND
          retailer_product_id = $2
        ;`, [rootProductAndClones.rootProduct.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId, rootProductAndClones.rootProduct.retailerProductId]);
        expect(productRes.rowCount).toEqual(1);
        const productId = productRes.rows[0].id;

        // check that there are 11 value_at_times for the root product 
        const valuesRes = await client.query("SELECT * FROM value_at_times WHERE product_id = $1 ORDER BY time;", [productId]);
        expect(valuesRes.rowCount).toEqual(11);
        valuesRes.rows.forEach((valueRow, i) => {
          if (i === 0) {
            expect(valueRow).toEqual(expect.objectContaining({
              ...productToValueRow(rootProductAndClones.rootProduct)
            }));
          } else {
            expect(valueRow).toEqual(expect.objectContaining({
              ...productToValueRow(rootProductAndClones.differentPricePointProducts[i-1])
            }));
          }
        })
      } finally {
        client.release();
      }
    }
  })

  it.each(categoriesAndTheirProducts)("can create a product with a category that hasn't been created", async (categoryAndProduct) => {
    const productRepository: ProductRepository = new PostgresProductRepository(pool);
    
    for (const product of categoryAndProduct.products) {
      await productRepository.createOrUpdate(product);

      const client = await pool.connect();

      try {
        const productRes = await client.query(`SELECT * FROM products WHERE 
          retailer_id = $1 AND   
          retailer_product_id = $2 AND   
          cross_retailer_id IS NOT DISTINCT FROM $3 AND   
          gtin_format IS NOT DISTINCT FROM $4 AND
          name = $5 AND
          brand IS NOT DISTINCT FROM $6 AND
          path = $7 AND
          description = $8 AND
          image_url IS NOT DISTINCT FROM $9 
        ;`, [
            product.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId,
            product.retailerProductId,
            product.crossProductIdentity?.crossRetailerId,
            product.crossProductIdentity?.gtinFormat,
            product.name,
            product.brand,
            product.path,
            product.description,
            product.imageUrl
        ]);

        // check the product
        expect(productRes.rowCount).toEqual(1);
        expect(productRes.rows[0]).toEqual(expect.objectContaining({
          retailer_id: product.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId,
          ...productToProductRow(product)
        }));

      } finally {
        client.release();
      }

    }

    // check there are 6 products total
    const client = await pool.connect();
    try {
      const productsRes = await client.query("SELECT * FROM products;");
      expect(productsRes.rowCount).toEqual(6);

      const categoryRes = await client.query("SELECT * FROM categories;");
      expect(categoryRes.rowCount).toEqual(1);
      expect(categoryRes.rows[0]).toEqual(expect.objectContaining({
        retailer_id: categoryAndProduct.category.retailer === "Woolworths" ? woolworthsRetailerId : colesRetailerId,
        path: categoryAndProduct.category.path,
        retailer_designated_category_id: categoryAndProduct.category.retailerDesignatedCategoryId,
        name: categoryAndProduct.category.name
      }))
    } finally {
      client.release();
    }
  })

  it.each(categoriesAndTheirProducts)("can create products and find them", async (categoryAndProducts) => {
    const categoryRepository = new PostgresCategoryRepository(pool);
    try {
      await categoryRepository.createOrUpdate(categoryAndProducts.category);

      const productRepository: ProductRepository = new PostgresProductRepository(pool);
      
      for (const product of categoryAndProducts.products) {
        await productRepository.createOrUpdate(product);

        const findByName = await productRepository.findBy("name", product.name);
        const findByPath = await productRepository.findBy("path", product.path);
        const findByDescription = await productRepository.findBy("description", product.description);
        const findByRetailerProductId = await productRepository.findBy("retailerProductId", product.retailerProductId);

        const expectToContainProduct = (result: Product[]) => {
          expect(result.length).toBeGreaterThanOrEqual(1) ;
          expect(result).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                ...product,
                currentValue: expect.objectContaining({
                  ...product.currentValue,
                  price: String(product.currentValue.price.toFixed(2)),
                  time: expect.any(Date),
                }),
              })
            ])
          );
        };

        const expectToRoughlyMatchTime = (result: Product[]) => {
          expect(Math.abs(result[0].currentValue.time.getTime() - product.currentValue.time.getTime())).toBeLessThanOrEqual(60000);
        }

        expectToContainProduct(findByName);
        expectToContainProduct(findByPath);
        expectToContainProduct(findByDescription);
        expectToContainProduct(findByRetailerProductId);

        expectToRoughlyMatchTime(findByName);
        expectToRoughlyMatchTime(findByPath);
        expectToRoughlyMatchTime(findByDescription);
        expectToRoughlyMatchTime(findByRetailerProductId);

        if (product.imageUrl !== undefined) {
          const findByImageUrl = await productRepository.findBy("imageUrl", product.imageUrl);
          expectToContainProduct(findByImageUrl);
          expectToRoughlyMatchTime(findByImageUrl);
        }
        if (product.brand !== undefined) {
          const findByBrand = await productRepository.findBy("brand", product.brand);
          expectToContainProduct(findByBrand);
          expectToRoughlyMatchTime(findByBrand);
        }
        if (product.crossProductIdentity !== undefined) {
          const findByCrossProductId = await productRepository.findBy("crossProductIdentity", product.crossProductIdentity);
          expectToContainProduct(findByCrossProductId);
          expectToRoughlyMatchTime(findByCrossProductId);
        }
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

  })
});
