import type { PricePoint } from '$lib/types/price-point';
import data from "./mock-data.json";

interface Product {
	"cents": number,
	"department": string,
	"grams": number,
	"id": string,
	"name": string,
	"store": string,
	"time": string
}

const MOCK_PRODUCTS: Product[]= data as Product[];

const DEPARTMENTS = [
	'Fruit & Vegetables',
	'Dairy & Eggs',
	'Meat & Seafood',
	'Bakery',
	'Pantry',
	'Frozen',
	'Beverages',
	'Snacks'
];

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
