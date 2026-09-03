import { HOST, PORT, DATABASE, USER, PASSWORD, USE_MOCK_DATA } from '$env/static/private';
import { makeConnectionPool, PostgresProductRepository, type ProductRepository } from '@grocery-tracker/db';
import type { PageServerLoad } from './$types';
import { Product } from '@grocery-tracker/domain-model';
import { mockProductSearch } from '$lib/server/mock-queries';


export type SearchPageLoadResponse =
	| { type: 'internal_error', reason: string }
	| { type: 'success'; items: Product[]; totalPages: number };

export const load: PageServerLoad = async ({ url }): Promise<SearchPageLoadResponse> => {

	if (USE_MOCK_DATA) {
		return mockProductSearch(url);
	}
	// using the name search, id search and the page use the repository methods
	try {
		// pagination on search results page (search?product=shoes&page=2&pageSize=20)
		const nameSearch = url.searchParams.get('name')?.toLowerCase();
		const page = parseInt(url.searchParams.get('page') ?? '1');
		const idSearch = url.searchParams.get("id");
		const pool = makeConnectionPool({
			host: HOST,
			port: Number(PORT),
			database: DATABASE,
			user: USER,
			password: PASSWORD
		});
		const productRepository: ProductRepository = new PostgresProductRepository(pool);

		const products = await productRepository.findBy([
			{
				key: "name",
				value: nameSearch ?? ""
			},
			{
				key: "retailerProductId",
				value: idSearch ?? ""
			}
		])

		const totalPages = Math.floor(products.length / 20);
		return {
			type: "success",
			items: products.slice((page - 1) * 20, page * 20),
			totalPages
		}
	} catch (error) {
		return {
			type: 'internal_error',
			reason: String(error)
		}
	}

};
