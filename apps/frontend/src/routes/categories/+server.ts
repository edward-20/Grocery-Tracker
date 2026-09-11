import { DB_HOST, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { PostgresCategoryRepository, type CategoryRepository } from "@grocery-tracker/db";
import { makeConnectionPool } from '@grocery-tracker/db';
export async function GET({ url } : RequestEvent ) { // return type this function
	const query = url.searchParams.get('query') ?? '';
	const pool = makeConnectionPool({
		host: DB_HOST,
		port: Number(DB_PORT),
		database: DB_DATABASE,
		user: DB_USER,
		password: DB_PASSWORD
	});
	const categoryRepository: CategoryRepository = new PostgresCategoryRepository(pool);

	const matchingCategories = await categoryRepository.findSimilarBy("name", query, 10);

	return json(matchingCategories.map(category => category.name));
}
