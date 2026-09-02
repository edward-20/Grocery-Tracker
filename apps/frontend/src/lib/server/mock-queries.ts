import type { PricePoint } from '$lib/types/price-point';
import { Product, ValueAtTime, type Category } from '@grocery-tracker/domain-model';


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

const MOCK_PRODUCTS: Product[]= Array.from({length: 500}).map(() => {
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
	return MOCK_PRODUCTS.filter((p) => p.id.toLowerCase().includes(lower))
		.map((p) => p.id)
		.slice(0, 10);
}

export function mockDepartmentSearch(query: string): string[] {
	const lower = query.toLowerCase();
	return DEPARTMENTS.filter((d) => d.toLowerCase().includes(lower)).slice(0, 10);
}

export type MockProduct = {
	name: string;
	store: 'Coles' | 'Woolworths';
	location: string;
	department: string;
	id: string;
	cents: number;
	grams: number;
	cents_change: number;
	time: string;
};

export function mockProductSearch(params: {
	name?: string;
	store?: string[];
	department?: string;
	id?: string;
	minPrice?: number;
	maxPrice?: number;
	page: number;
	pageSize: number;
}): { items: MockProduct[]; total: number } {
	let filtered = [...MOCK_PRODUCTS];

	if (params.name) {
		const lower = params.name.toLowerCase();
		filtered = filtered.filter((p) => p.name.toLowerCase().includes(lower));
	}

	if (params.store && params.store.length === 1) {
		filtered = filtered.filter((p) => p.store === params.store![0]);
	}

	if (params.department) {
		filtered = filtered.filter((p) => p.department === params.department);
	}

	if (params.id) {
		filtered = filtered.filter((p) => p.id === params.id);
	}

	if (params.minPrice !== undefined) {
		filtered = filtered.filter((p) => p.cents >= params.minPrice! * 100);
	}

	if (params.maxPrice !== undefined) {
		filtered = filtered.filter((p) => p.cents <= params.maxPrice! * 100);
	}

	const total = filtered.length;
	const start = (params.page - 1) * params.pageSize;
	const items: MockProduct[] = filtered.slice(start, start + params.pageSize).map((p) => ({
		...p,
		location: 'Melbourne CBD',
		cents_change: Math.floor(Math.random() * 200) - 100,
		store: p.store as 'Coles' | 'Woolworths'
	}));

	return { items, total };
}

export function mockProductDetail(id: string): PricePoint[] {
	return MOCK_PRODUCTS.filter((p) => p.id === id).map((p) => ({
		time: p.time,
		store: p.store,
		cents: p.cents,
		name: p.name,
		grams: p.grams
	}));
}
