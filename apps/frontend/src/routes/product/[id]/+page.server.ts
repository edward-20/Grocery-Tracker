import { env } from '$env/dynamic/private';
const { INFLUXDB_PRODUCT_TABLE, USE_MOCK_DATA } = env;
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	escapeSqlStringLiteral,
	runInfluxSqlQuery,
	sqlQuotedIdent
} from '$lib/server/influx-sql-query';
import { influxTimeToIso } from '$lib/influx-time';
import type { PricePoint } from '$lib/types/price-point';
import { mockProductDetail } from '$lib/server/mock-queries';
export type { PricePoint };

type LoadSuccess = {
	type: 'success';
	id: string;
	productName: string;
	points: PricePoint[];
};

type LoadError = {
	type: 'influxdb_error' | 'internal_error';
	id: string;
	code?: number;
	message: string;
};

export const load: PageServerLoad = async ({ params }): Promise<LoadSuccess | LoadError> => {
	const rawId = params.id?.trim();
	if (!rawId) {
		error(400, 'Missing product id');
	}

	if (USE_MOCK_DATA === 'true') {
		const points = mockProductDetail(rawId);
		return {
			type: 'success',
			id: rawId,
			productName: points[0]?.name ?? rawId,
			points
		};
	}

	const idEscaped = escapeSqlStringLiteral(rawId);
	const table = sqlQuotedIdent(INFLUXDB_PRODUCT_TABLE);

	const sql = `
SELECT time, store, cents, name, grams
FROM ${table}
WHERE id = '${idEscaped}'
  AND store IN ('Coles', 'Woolworths')
  AND time >= now() - interval '365 days'
ORDER BY time ASC
`.trim();

	const result = await runInfluxSqlQuery(sql);
	if (!result.ok) {
		return {
			type: 'influxdb_error',
			id: rawId,
			code: result.status,
			message: result.body
		};
	}

	const points: PricePoint[] = result.rows.map((row) => ({
		time: influxTimeToIso(row.time),
		store: String(row.store ?? ''),
		cents: Number(row.cents ?? 0),
		name: String(row.name ?? ''),
		grams: Number(row.grams ?? 0)
	}));

	const productName = points.find((p) => p.name)?.name ?? rawId;

	return {
		type: 'success',
		id: rawId,
		productName,
		points
	};
};
