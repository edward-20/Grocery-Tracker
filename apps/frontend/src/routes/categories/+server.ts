import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { getCategoryRepository } from '$lib/server/database';
export async function GET({ url }: RequestEvent) {
	// return type this function
	const query = url.searchParams.get('query') ?? '';
	const categoryRepository = getCategoryRepository();

	try {
		const matchingCategories = await categoryRepository.findSimilarBy('name', query, 10);
		return json(matchingCategories.map((category) => category.name));
	} catch (error) {
		console.error(error);
		return json([]);
	}
}
