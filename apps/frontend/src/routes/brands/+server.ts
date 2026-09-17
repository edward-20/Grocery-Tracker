import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { PostgresProductRepository, type ProductRepository } from "@grocery-tracker/db";
import { makeConnectionPool } from '@grocery-tracker/db';
import { loadConfig } from '@grocery-tracker/utils';

const { CONFIG_PATH } = env;
export async function GET({ url } : RequestEvent ) {
	const query = url.searchParams.get('query') ?? '';
	const config = loadConfig(CONFIG_PATH);
	const pool = makeConnectionPool({
		...config.database
	});
	const productRepository: ProductRepository = new PostgresProductRepository(pool);

	const matchingProducts = await productRepository.findSimilarBy({key: "brand", value: query}, [0, 9]);

	return json(matchingProducts.map(product => product.brand));
}
