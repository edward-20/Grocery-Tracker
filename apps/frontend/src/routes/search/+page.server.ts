import type { PageServerLoad } from './$types';
import { Product } from '@grocery-tracker/domain-model';
import { getProductRepository } from '$lib/server/database';

export type SearchPageLoadResponse =
	| { type: 'internal_error'; reason: string }
	| { type: 'success'; items: Product[]; totalPages: number };

export const load: PageServerLoad = async ({ url }): Promise<SearchPageLoadResponse> => {
	// using the name search, id search and the page use the repository methods
	try {
		// pagination on search results page (search?product=shoes&page=2&pageSize=20)
		const nameSearch = url.searchParams.get('name')?.toLowerCase();
		const page = parseInt(url.searchParams.get('page') ?? '1');
		const idSearch = url.searchParams.get('id');
		const productRepository = getProductRepository();

		const products = await productRepository.findSimilarBy(
			[
				{
					key: 'name',
					value: nameSearch ?? ''
				},
				{
					key: 'retailerProductId',
					value: idSearch ?? ''
				}
			],
			[(page - 1) * 20, page * 20 - 1]
		);

		const totalProductCount = await productRepository.countSimilarBy([
			{
				key: 'name',
				value: nameSearch ?? ''
			},
			{
				key: 'retailerProductId',
				value: idSearch ?? ''
			}
		]);

		const totalPages = Math.ceil(totalProductCount / 20);

		return {
			type: 'success',
			items: products,
			totalPages
		};
	} catch (error) {
		return {
			type: 'internal_error',
			reason: String(error)
		};
	}
};
