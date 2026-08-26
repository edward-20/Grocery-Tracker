import { beforeEach, afterAll, beforeAll, describe, expect, it } from "vitest";
import { CategoryRepository, ProductRepository, PostgresCategoryRepository, PostgresProductRepository } from "@grocery-tracker/db";
import { Pool } from "pg";
import { simpleCategory, productToProductRow, productToValueRow, categoriesAndTheirProducts, categoriesAndTheirProductsWithMultiplePricePoints } from "./helper.js";

let pool: Pool;
let woolworthsRetailerId: number;
let colesRetailerId: number;

beforeAll(() => {
  pool = new Pool({
    connectionString: `postgresql://test:test@localhost:5433/test`
  });
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  })
})

afterAll(async () => {
  console.log("Ending pool...");
  await pool.end();
  console.log("Pool ended");
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

});
