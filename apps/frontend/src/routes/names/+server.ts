import { env } from '$env/dynamic/private';

import { json } from '@sveltejs/kit';
import {
	escapeSqlStringLiteral,
	runInfluxSqlQuery,
	sqlQuotedIdent
} from '$lib/server/influx-sql-query';
import { mockNameSearch } from '$lib/server/mock-queries';
import type { RequestEvent } from './$types';

const { INFLUXDB_PRODUCT_TABLE, USE_MOCK_DATA } = env;
export async function GET({ url }: RequestEvent) {
	const query = url.searchParams.get('query') ?? '';

	if (USE_MOCK_DATA === 'true') {
		return json(mockNameSearch(query));
	}

	const pattern = escapeSqlStringLiteral(query);
	const table = sqlQuotedIdent(INFLUXDB_PRODUCT_TABLE);
	const sql = `SELECT DISTINCT name FROM ${table} WHERE name ILIKE '%${pattern}%' LIMIT 10`;

	try {
		const result = await runInfluxSqlQuery(sql);
		if (!result.ok) {
			console.error('influx names query failed', result.status, result.body);
			return json([]);
		}
		const parsedData = result.rows
			.map((x) => x.name)
			.filter((v): v is string => typeof v === 'string');
		return json(parsedData);
	} catch (err) {
		console.error('influx names query error', err);
		return json([]);
	}
}
