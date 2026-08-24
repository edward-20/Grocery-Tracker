import { env } from '$env/dynamic/private';
const { INFLUXDB_PRODUCT_TABLE, USE_MOCK_DATA } = env;
import type { PageServerLoad } from './$types';
import {
	escapeSqlStringLiteral,
	runInfluxSqlQuery,
	sqlQuotedIdent
} from '$lib/server/influx-sql-query';
import { mockProductSearch } from '$lib/server/mock-queries';

type Product = {
	name: string;
	store: 'Coles' | 'Woolworths';
	location: string;
	department: string;
	id: string;
	cents: number;
	grams: number;
	cents_change: number;
	time: string;
};

type ServerResponse =
	| { type: 'influxdb_error'; code: number }
	| { type: 'internal_error' }
	| { type: 'success'; items: Product[]; totalPages: number };

function rowToProduct(row: Record<string, unknown>): Product {
	const store = row.store;
	const storeOk = store === 'Coles' || store === 'Woolworths' ? store : 'Coles';
	return {
		name: String(row.name ?? ''),
		store: storeOk,
		location: String(row.location ?? ''),
		department: String(row.department ?? ''),
		id: String(row.id ?? ''),
		cents: Number(row.cents ?? 0),
		grams: Number(row.grams ?? 0),
		cents_change: Number(row.cents_change ?? 0),
		time: String(row.time ?? '')
	};
}

export const load: PageServerLoad<ServerResponse> = async ({ url }): Promise<ServerResponse> => {
	// pagination on search results page (search?product=shoes&page=2&pageSize=20)
	const productSearch = url.searchParams.get('product')?.toLowerCase();
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20');

	if (USE_MOCK_DATA === 'true') {
		const storeFilter = url.searchParams.getAll('store');
		const result = mockProductSearch({
			name: productSearch,
			store: storeFilter.length > 0 ? storeFilter : undefined,
			department: url.searchParams.get('departments') ?? undefined,
			id: url.searchParams.get('id') ?? undefined,
			minPrice: url.searchParams.get('minPrice')
				? parseFloat(url.searchParams.get('minPrice')!)
				: undefined,
			maxPrice: url.searchParams.get('maxPrice')
				? parseFloat(url.searchParams.get('maxPrice')!)
				: undefined,
			page,
			pageSize
		});
		return {
			type: 'success',
			items: result.items,
			totalPages: Math.ceil(result.total / pageSize)
		} satisfies ServerResponse;
	}

	let storeSelectionQuery = '';
	if (url.searchParams.has('store')) {
		const storeSearch = url.searchParams.getAll('store');
		if (storeSearch.length === 0) {
			return { type: 'success', items: [], totalPages: 0 } as ServerResponse;
		}
		if (storeSearch.length === 2) {
			storeSelectionQuery = '';
		} else if (storeSearch.length === 1 && storeSearch[0] === 'woolworths') {
			storeSelectionQuery = ` AND store = 'Woolworths'`;
		} else {
			storeSelectionQuery = ` AND store = 'Coles'`;
		}
	}

	let departmentSelectionQuery = '';
	if (url.searchParams.has('departments')) {
		const department = url.searchParams.get('departments');
		if (department) {
			const safe = escapeSqlStringLiteral(department);
			departmentSelectionQuery = ` AND department = '${safe}'`;
		}
	}

	let idSelectionQuery = '';
	if (url.searchParams.has('id')) {
		const id = url.searchParams.get('id');
		if (id) {
			const safe = escapeSqlStringLiteral(id);
			idSelectionQuery = ` AND id = '${safe}'`;
		}
	}

	let priceSelectionQuery = '';
	if (url.searchParams.has('minPrice') && url.searchParams.has('maxPrice')) {
		const minPrice = url.searchParams.get('minPrice');
		const maxPrice = url.searchParams.get('maxPrice');
		if (minPrice !== null && maxPrice !== null) {
			const minCents = parseFloat(minPrice) * 100;
			const maxCents = parseFloat(maxPrice) * 100;
			if (!Number.isNaN(minCents) && !Number.isNaN(maxCents)) {
				priceSelectionQuery = ` AND cents <= ${maxCents} AND cents >= ${minCents}`;
			}
		}
	}

	/*
	 * order by (default or user defined)
	 * page
	 * page size
	 */

	const table = sqlQuotedIdent(INFLUXDB_PRODUCT_TABLE);
	let nameClause = '';
	if (productSearch) {
		const pattern = escapeSqlStringLiteral(productSearch);
		nameClause = ` AND name ILIKE '%${pattern}%'`;
	}

	const sql = `SELECT * FROM ${table}
WHERE time >= now() - interval '365 days'${nameClause}${storeSelectionQuery}${departmentSelectionQuery}${idSelectionQuery}${priceSelectionQuery}
ORDER BY time ASC
LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

	// need to compute the number of pages based on the total number of results,
	// but for now we can just return an empty array if the page or page size is
	// invalid
	const countSql = `SELECT COUNT(*) as total FROM ${table}
WHERE time >= now() - interval '365 days'${nameClause}${storeSelectionQuery}${departmentSelectionQuery}${idSelectionQuery}${priceSelectionQuery}`;

	try {
		const result = await runInfluxSqlQuery(sql);
		const resultCount = await runInfluxSqlQuery(countSql);
		if (!result.ok) {
			console.error('influx search query failed', result.status, result.body);
			return { type: 'influxdb_error', code: result.status } satisfies ServerResponse;
		}
		const items = result.rows.map(rowToProduct);
		if (resultCount.ok) {
			return {
				type: 'success',
				items,
				totalPages: Math.ceil(Number(resultCount.rows[0].total) / pageSize)
			} satisfies ServerResponse;
		}
		return { type: 'success', items, totalPages: -1 } satisfies ServerResponse;
	} catch (err) {
		console.error('influx search query error', err);
		return { type: 'internal_error' } satisfies ServerResponse;
	}
};
