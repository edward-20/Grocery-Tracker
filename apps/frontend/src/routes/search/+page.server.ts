import { env } from '$env/dynamic/private';
import { makeConnectionPool, PostgresProductRepository, type ProductRepository } from '@grocery-tracker/db';
import type { PageServerLoad } from './$types';
import { Product } from '@grocery-tracker/domain-model';
import { loadConfig } from '@grocery-tracker/utils';

const { SCRAPER_CONFIG } = env;

export type SearchPageLoadResponse =
	| { type: 'internal_error', reason: string }
	| { type: 'success'; items: Product[]; totalPages: number };

export const load: PageServerLoad = async ({ url }): Promise<SearchPageLoadResponse> => {
	// using the name search, id search and the page use the repository methods
	try {
		const config = loadConfig(SCRAPER_CONFIG);
		// pagination on search results page (search?product=shoes&page=2&pageSize=20)
		const nameSearch = url.searchParams.get('name')?.toLowerCase();
		const page = parseInt(url.searchParams.get('page') ?? '1');
		const idSearch = url.searchParams.get("id");
		const pool = makeConnectionPool({
			...config.database,
		});
		const productRepository: ProductRepository = new PostgresProductRepository(pool);

		const products = await productRepository.findSimilarBy([
			{
				key: "name",
				value: nameSearch ?? ""
			},
			{
				key: "retailerProductId",
				value: idSearch ?? ""
			}
		], [(page - 1) * 20, page * 20 - 1]);

		const totalProductCount = await productRepository.countSimilarBy([
			{
				key: "name",
				value: nameSearch ?? ""
			},
			{
				key: "retailerProductId",
				value: idSearch ?? ""
			}
		]);

		console.log(totalProductCount);
		const totalPages = Math.ceil(totalProductCount / 20);
		console.log(`total pages: ${totalPages}, total product count: ${totalProductCount}`);

		return {
			type: "success",
			items: products,
			totalPages
		}
	} catch (error) {
		return {
			type: 'internal_error',
			reason: String(error)
		}
	}

};
