import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { getProductRepository } from '$lib/server/database';

export async function GET({ url }: RequestEvent) {
	// return type this function
	const query = url.searchParams.get('query') ?? '';
	const productRepository = getProductRepository();

	try {
		const matchingProducts = await productRepository.findSimilarBy(
			{ key: 'name', value: query },
			[0, 9]
		);
		return json(matchingProducts.map((product) => product.name));
	} catch (error) {
		console.error(error);
		return json([]);
	}
}
