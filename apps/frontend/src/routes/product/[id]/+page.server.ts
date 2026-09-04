import { DB_HOST, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD, USE_MOCK_DATA } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { ValueAtTime } from '@grocery-tracker/domain-model';

type PriceHistoryPageLoadResponse = {
	type: 'internal_error';
	message: string;
} | {
	type: 'success';
	id: string;
	productName: string;
	points: ValueAtTime[];
}

export const load: PageServerLoad = async ({ params }): Promise<PriceHistoryPageLoadResponse> => {
	const rawId = params.id?.trim();
	if (!rawId) {
		error(400, 'Missing product id');
	}

	if (USE_MOCK_DATA === 'true') {
		const points = mockProductDetail(rawId);
		return {
			type: 'success',
			id: rawId,
			productName: 
			points
		};
	}
};
