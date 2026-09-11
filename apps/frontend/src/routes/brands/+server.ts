import { DB_HOST, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { PostgresProductRepository, type ProductRepository } from "@grocery-tracker/db";
import { makeConnectionPool } from '@grocery-tracker/db';
export async function GET({ url } : RequestEvent ) {
	const query = url.searchParams.get('query') ?? '';
	const pool = makeConnectionPool({
		host: DB_HOST,
		port: Number(DB_PORT),
		database: DB_DATABASE,
		user: DB_USER,
		password: DB_PASSWORD
	});
	const productRepository: ProductRepository = new PostgresProductRepository(pool);

	const matchingProducts = await productRepository.findSimilarBy({key: "brand", value: query}, [0, 9]);

	return json(matchingProducts.map(product => product.brand));
}
