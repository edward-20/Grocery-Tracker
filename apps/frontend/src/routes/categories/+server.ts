import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { PostgresCategoryRepository, type CategoryRepository } from "@grocery-tracker/db";
import { makeConnectionPool } from '@grocery-tracker/db';
import { loadConfig } from '@grocery-tracker/utils';

const { SCRAPER_CONFIG } = env;
export async function GET({ url } : RequestEvent ) { // return type this function
	const query = url.searchParams.get('query') ?? '';
	const config = loadConfig(SCRAPER_CONFIG);
	const pool = makeConnectionPool({
		...config.database
	});
	const categoryRepository: CategoryRepository = new PostgresCategoryRepository(pool);

	const matchingCategories = await categoryRepository.findSimilarBy("name", query, 10);

	return json(matchingCategories.map(category => category.name));
}
