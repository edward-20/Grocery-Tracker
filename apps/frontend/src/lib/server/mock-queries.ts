import { Product, ValueAtTime, type Category } from '@grocery-tracker/domain-model';
import type { SearchPageLoadResponse } from '../../routes/search/+page.server';

const CATEGORIES: Category[] = [
	{
	  retailer: "Woolworths",
	  retailerDesignatedCategoryId: "vn-9e",
	  name: "Fruits and Vegs",
	  path: "/browse/fruit-veg"
	},
	{
	  retailer: "Woolworths",
	  retailerDesignatedCategoryId: "v0wd03",
	  name: "Meat and Bread",
	  path: "/browse/meat-bread"
	},
	{
	  retailer: "Woolworths",
	  retailerDesignatedCategoryId: "sne9g239",
	  name: "Cheese",
	  path: "/browse/cheese"
	},
	{
	  retailer: "Woolworths",
	  retailerDesignatedCategoryId: "sdj0v-g03-",
	  name: "Pots",
	  path: "/browse/pots"
	},
	{
	  retailer: "Coles",
	  retailerDesignatedCategoryId: "acn",
	  name: "Major",
	  path: "/major"
	},
	{
	  retailer: "Coles",
	  retailerDesignatedCategoryId: "apdnv3940fj",
	  name: "Immanuel",
	  path: "/immanuel"
	},
	{
	  retailer: "Coles",
	  retailerDesignatedCategoryId: "bdnv-9",
	  name: "Hotel",
	  path: "/hotel"
	},
	{
	  retailer: "Coles",
	  retailerDesignatedCategoryId: "fewnv9",
	  name: "Seafood",
	  path: "/seafood"
	},
	{
	  retailer: "Coles",
	  retailerDesignatedCategoryId: "sd",
	  name: "Failure",
	  path: "/failure"
	},
];

function getRandomElemFromArray<T>(arr: Array<T>): T {
	const l = arr.length;
	const randInd = Math.floor(Math.random() * l);
	return arr[randInd];
}

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

function generateRandomValueAtTime(): ValueAtTime {
  return new ValueAtTime(generateRandomString(3), Number((Math.random()*100).toFixed(2)), new Date());
}

const MOCK_PRODUCTS: Product[]= Array.from({length: 1000}).map(() => {
	return new Product({
		retailer: Math.random() > 0.5 ? "Woolworths" : "Coles",
	  	retailerProductId: generateRandomString(10),
	  	category: getRandomElemFromArray(CATEGORIES),

	  	currentValue: generateRandomValueAtTime(),
	  	name: generateRandomString(7),
	  	path: generateRandomString(7),
	  	description: generateRandomString(15),
	  	brand: Math.random() > 0.5 ? generateRandomString(7) : undefined,
	  	imageUrl: Math.random() > 0.5 ? generateRandomString(7) : undefined,
		crossProductIdentity: Math.random() > 0.5 ? {
		  crossRetailerId: generateRandomString(5),
		  gtinFormat: 13
		} : undefined
	})
});


export function mockNameSearch(query: string): string[] {
	const lower = query.toLowerCase();
	return MOCK_PRODUCTS.filter((p) => p.name.toLowerCase().includes(lower))
		.map((p) => p.name)
		.slice(0, 10);
}

export function mockIdSearch(query: string): string[] {
	const lower = query.toLowerCase();
	return MOCK_PRODUCTS.filter((p) => p.retailerProductId.toLowerCase().includes(lower))
		.map((p) => p.retailerProductId)
		.slice(0, 10);
}

export function mockCategorySearch(query: string): string[] {
	const lower = query.toLowerCase();
	return CATEGORIES.filter((d) => d.name.includes(lower)).slice(0, 10).map(category => category.name);
}

export function mockBrandSearch(query: string): string[] {
	const lower = query.toLowerCase();
	function hasBrand(product: Product): product is Product & {
		brand: string
	} {
		return product.brand ? false : true;
	}
	return MOCK_PRODUCTS.filter(hasBrand).filter((d) => d.brand.includes(lower)).slice(0, 10).map(product => product.brand);
}

// full mock of the search page
export function mockProductSearch(url: URL): SearchPageLoadResponse {
  const nameSearch = url.searchParams.get('name')?.toLowerCase();
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const idSearch = url.searchParams.get("id")?.toLowerCase();

  const result = MOCK_PRODUCTS
      .filter(product => product.name.toLowerCase().includes(nameSearch ?? ""))
      .filter(product => product.retailerProductId.toLowerCase().includes(idSearch ?? ""))

  return { 
    type: "success",
    items: result.slice((page - 1) * 20, page * 20),
    totalPages: Math.floor(result.length / 20)
  }
}
