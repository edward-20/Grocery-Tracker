import { HOST, PORT, DATABASE, USER, PASSWORD, USE_MOCK_DATA } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { mockIdSearch } from '$lib/server/mock-queries';
import type { RequestEvent } from './$types';
import { PostgresProductRepository, type ProductRepository } from "@grocery-tracker/db";
import { makeConnectionPool } from '@grocery-tracker/db';
export async function GET({ url } : RequestEvent ) {
	const query = url.searchParams.get('query') ?? '';
	if (USE_MOCK_DATA === 'true') {
		return json(mockIdSearch(query));
	}

	const pool = makeConnectionPool({
		host: HOST,
		port: Number(PORT),
		database: DATABASE,
		user: USER,
		password: PASSWORD
	});
	const productRepository: ProductRepository = new PostgresProductRepository(pool);

	const matchingProducts = await productRepository.findSimilarBy({key: "brand", value: query});

	return json(matchingProducts.map(product => product.brand));
}
