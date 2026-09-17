import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Product, type ValueAtTime } from '@grocery-tracker/domain-model';
import { makeConnectionPool, PostgresProductRepository } from '@grocery-tracker/db';
import type { ProductRepository } from '@grocery-tracker/db';

import { loadConfig } from '@grocery-tracker/utils';
const { CONFIG_PATH } = env;

export type PriceHistoryPageLoadResponse = {
	type: 'internal_error';
	message: string;
} | {
	type: 'success';
	product: Product;
	points: ValueAtTime[];
}

export const load: PageServerLoad = async ({ params }): Promise<PriceHistoryPageLoadResponse> => {
	const [retailer, retailerProductId] = JSON.parse(
        decodeURIComponent(params.id)
    );

	let pool: ReturnType<typeof makeConnectionPool> | undefined;
	try {
		const config = loadConfig(CONFIG_PATH);
		const pool = makeConnectionPool({
			...config.database
		});
		const productRepository: ProductRepository = new PostgresProductRepository(pool);
		const {product, history} = await productRepository.findWithPriceHistory(retailer, retailerProductId)
		return {
			type: 'success',
			product,
			points: history
		}
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await pool?.end();
	}
};
