import { DB_HOST, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD, USE_MOCK_DATA } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { mockIdSearch } from '$lib/server/mock-queries';
import type { RequestEvent } from './$types';
import { PostgresProductRepository, type ProductRepository } from "@grocery-tracker/db";
import { makeConnectionPool } from '@grocery-tracker/db';
export async function GET({ url } : RequestEvent ) { // return type this function
	const query = url.searchParams.get('query') ?? '';
	if (USE_MOCK_DATA === 'true') {
		return json(mockIdSearch(query));
	}

	const pool = makeConnectionPool({
		host: DB_HOST,
		port: Number(DB_PORT),
		database: DB_DATABASE,
		user: DB_USER,
		password: DB_PASSWORD
	});
	const productRepository: ProductRepository = new PostgresProductRepository(pool);

	const matchingProducts = await productRepository.findSimilarBy({key: "retailerProductId", value: query}, [0, 10]);

	return json(matchingProducts.map(product => product.retailerProductId));
}
