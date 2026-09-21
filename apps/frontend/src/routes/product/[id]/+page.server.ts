import type { PageServerLoad } from './$types';
import { Product, type ValueAtTime } from '@grocery-tracker/domain-model';
import { getProductRepository } from '$lib/server/database';

export type PriceHistoryPageLoadResponse =
	| {
			type: 'internal_error';
			message: string;
	  }
	| {
			type: 'success';
			product: Product;
			points: ValueAtTime[];
	  };

export const load: PageServerLoad = async ({ params }): Promise<PriceHistoryPageLoadResponse> => {
	const [retailer, retailerProductId] = JSON.parse(decodeURIComponent(params.id));

	try {
		const productRepository = getProductRepository();
		const { product, history } = await productRepository.findWithPriceHistory(
			retailer,
			retailerProductId
		);
		return {
			type: 'success',
			product,
			points: history
		};
	} catch (error) {
		console.error(error);
		throw error;
	}
};
