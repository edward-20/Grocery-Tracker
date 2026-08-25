import { Category, Product, ValueAtTime } from "@grocery-tracker/domain-model";
function generateRandomString(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export function generateRandomValueAtTime(): ValueAtTime {
  return new ValueAtTime(generateRandomString(3), Number((Math.random()*100).toFixed(2)), new Date());
}

const fooCategories: Category[] = [
  {
    retailer: "Coles",
    retailerDesignatedCategoryId: "12947023",
    name: "Lunchbox",
    path: "/browse/lunchbox"
  },
  {
    retailer: "Coles",
    retailerDesignatedCategoryId: "ciwnod12",
    name: "Grey Matter",
    path: "/browse/grey-matter"
  },
  {
    retailer: "Coles",
    retailerDesignatedCategoryId: "19u92f0ehv",
    name: "Nujabes",
    path: "/browse/nujabes"
  },
  {
    retailer: "Coles",
    retailerDesignatedCategoryId: "v9w913ur90",
    name: "J Cole",
    path: "/browse/j-cole"
  },
  {
    retailer: "Coles",
    retailerDesignatedCategoryId: "substitute",
    name: "Great Socks",
    path: "/great-socks"
  },
  {
    retailer: "Woolworths",
    retailerDesignatedCategoryId: "1_aocin1",
    name: "Peter Pan",
    path: "/shop/browse/peter-pan"
  },
  {
    retailer: "Woolworths",
    retailerDesignatedCategoryId: "Reginals",
    name: "Reginals",
    path: "/unchbox"
  },
  {
    retailer: "Woolworths",
    retailerDesignatedCategoryId: "pet",
    name: "Lunchbox",
    path: "/browse/lunchbox"
  },
  {
    retailer: "Woolworths",
    retailerDesignatedCategoryId: "120",
    name: "Crazy",
    path: "/crazy"
  },
  {
    retailer: "Woolworths",
    retailerDesignatedCategoryId: "vni92013",
    name: "Heart",
    path: "heart"
  },
  {
    retailer: "Woolworths",
    retailerDesignatedCategoryId: "inv192",
    name: "Po",
    path: "p/ol"
  },
]

export const categoriesAndTheirProducts: {category: Category, products: Product[]}[] = fooCategories.map(category => {
  const hasCrossRetailerId = Math.random() > 0.5;
  return {
    category,
    products: Array.from(
      { length: 6 },
      () => new Product({
        retailer: category.retailer,
        retailerProductId: generateRandomString(6),
        category,
        currentValue: generateRandomValueAtTime(),
        name: generateRandomString(6),
        path: generateRandomString(7),
        description: generateRandomString(20),
        brand: Math.random() > 0.5 ? generateRandomString(10) : undefined,
        imageUrl: Math.random() > 0.5 ? generateRandomString(10) : undefined,
        crossProductIdentity: hasCrossRetailerId ? {
          crossRetailerId: generateRandomString(5),
          gtinFormat: 13
        } : undefined
    }))
  }
});

export const categoriesAndTheirProductsWithMultiplePricePoints: {
  category: Category, // 11 of these
  productsAndMultiPricePoints: {
    rootProduct: Product,
    differentPricePointProducts: Product[] // 10 for each rootProduct
  }[] // array of 6 (one for each root product)
}[] = categoriesAndTheirProducts.map(categoryAndProduct => {
  return {
    category: categoryAndProduct.category,
    productsAndMultiPricePoints: categoryAndProduct.products.map(rootProduct => {
      return {
        rootProduct,
        differentPricePointProducts: Array.from(
          { length: 10 },
          () => new Product({
            retailer: rootProduct.retailer,
            retailerProductId: rootProduct.retailerProductId,
            category: categoryAndProduct.category,
            currentValue: generateRandomValueAtTime(),
            name: rootProduct.name,
            path: rootProduct.path,
            description: rootProduct.description,
            brand: rootProduct.brand,
            imageUrl: rootProduct.imageUrl,
            crossProductIdentity: rootProduct.crossProductIdentity
          })
        )
      }
    })
  }
})


export const simpleCategory: Category = {
  retailer: "Woolworths",
  retailerDesignatedCategoryId: "a",
  name: "a",
  path: "/a"
};

// excludes the id and retailer_id
export function productToProductRow(product: Product) {
  return {
    retailer_product_id: product.retailerProductId,
    name: product.name,
    path: product.path,
    description: product.description,
    brand: product.brand ?? null,
    image_url: product.imageUrl ?? null,
    cross_retailer_id: product.crossProductIdentity?.crossRetailerId ?? null,
    gtin_format: product.crossProductIdentity?.crossRetailerId ?? null
  }
}

// excludes the product_id and time (because the time just has to match roughly)
export function productToValueRow(product: Product) {
  const currentValue = product.currentValue;
  return {
    size: currentValue.size,
    price: String(currentValue.price.toFixed(2)),
    // time: currentValue.time,
    unit_price: currentValue.unitPricing?.unitPrice.toFixed(2) ?? null,
    unit_price_quantity: currentValue.unitPricing?.unitPriceQuantity.toFixed(2) ?? null,
    unit_price_unit_of_measurement: currentValue.unitPricing?.unitPriceUnitofMeasurement ?? null,
  };
}
