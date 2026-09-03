import { HOST, PORT, DATABASE, USER, PASSWORD, USE_MOCK_DATA } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { mockCategorySearch } from '$lib/server/mock-queries';
import type { RequestEvent } from './$types';
import { PostgresCategoryRepository, type CategoryRepository } from "@grocery-tracker/db";
import { makeConnectionPool } from '@grocery-tracker/db';
export async function GET({ url } : RequestEvent ) { // return type this function
	const query = url.searchParams.get('query') ?? '';
	if (USE_MOCK_DATA === 'true') {
		return json(mockCategorySearch(query));
	}

	const pool = makeConnectionPool({
		host: HOST,
		port: Number(PORT),
		database: DATABASE,
		user: USER,
		password: PASSWORD
	});
	const categoryRepository: CategoryRepository = new PostgresCategoryRepository(pool);

	const matchingCategories = await categoryRepository.findSimilarBy("name", query);

	return json(matchingCategories.map(category => category.name));
}
