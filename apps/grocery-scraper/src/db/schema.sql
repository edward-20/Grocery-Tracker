BEGIN;

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- enums
CREATE TYPE unit_of_measurement AS ENUM (
  'Each', 'Kg', 'g', 'L', 'mL', 'SS', 'sheets', 'm', 'kgM'
);

-- domain data
CREATE TABLE IF NOT EXISTS retailers (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL UNIQUE
);
INSERT INTO retailers (name, url) VALUES ('Woolworths', 'https://www.woolworths.com.au'), ('Coles', 'https://www.coles.com.au');

CREATE TABLE IF NOT EXISTS categories (
  -- natural keys and surrogate id
  retailer_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  retailer_designated_category_id TEXT NOT NULL,
  name TEXT NOT NULL,
 
  FOREIGN KEY (retailer_id) REFERENCES retailers(id),
  UNIQUE (retailer_id, path)
);

CREATE TABLE IF NOT EXISTS products (
  -- natural keys and surrogate id
  retailer_id INTEGER NOT NULL,
  retailer_product_id TEXT NOT NULL,
  UNIQUE (retailer_id, retailer_product_id),
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  cross_retailer_id TEXT,
  gtin_format INTEGER,
  name TEXT NOT NULL,
  brand TEXT,
  path TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,

  CHECK ((cross_retailer_id IS NOT NULL AND gtin_format IS NOT NULL) OR (cross_retailer_id IS NULL AND gtin_format is NULL))
);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id INTEGER NOT NULL, 
  category_id INTEGER NOT NULL,

  FOREIGN KEY (product_id) REFERENCES products (id),
  FOREIGN KEY (category_id) REFERENCES categories (id),
  UNIQUE (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS value_at_times (
  -- natural key (time, product_id), surrogate id and foreign key (category_scrape_id)
  product_id INTEGER NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, time),

  -- unit price for comparison regardless of whether the product is discrete or non-discrete
  unit_price NUMERIC(8, 2),
  -- <unit_price_quantity> of <unit_price_measure_quantity> <unit_price_unit>
  unit_price_quantity NUMERIC(8, 2), -- woolworths: 1 (by default), coles: pricing.unit.quantity
  unit_price_unit_of_measurement unit_of_measurement, -- woolworths: CupMeasure (alphanumeric part), coles: pricing.unit.ofMeasureUnits

  -- size and price of the product
  size TEXT NOT NULL,
  price NUMERIC(8, 2) NOT NULL, -- woolworths: price, coles: pricing.now

  FOREIGN KEY (product_id) REFERENCES products (id),
  UNIQUE (product_id, time),
  CHECK (
    (unit_price IS NULL AND unit_price_quantity IS NULL AND unit_price_unit_of_measurement IS NULL) OR 
    (unit_price IS NOT NULL AND unit_price_quantity IS NOT NULL AND unit_price_unit_of_measurement IS NOT NULL)
  )
);

SELECT create_hypertable('value_at_times', 'time');

COMMIT;
