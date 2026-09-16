import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { PostgresProductRepository, type ProductRepository } from "@grocery-tracker/db";
import { makeConnectionPool } from '@grocery-tracker/db';
import { loadConfig } from '@grocery-tracker/utils';
const { SCRAPER_CONFIG } = env;

export async function GET({ url } : RequestEvent ) { // return type this function
	const query = url.searchParams.get('query') ?? '';
	const config = loadConfig(SCRAPER_CONFIG);
	const pool = makeConnectionPool({
		...config.database
	});
	const productRepository: ProductRepository = new PostgresProductRepository(pool);

	const matchingProducts = await productRepository.findSimilarBy({key: "name", value: query}, [0, 9]);

	return json(matchingProducts.map(product => product.name));
}
