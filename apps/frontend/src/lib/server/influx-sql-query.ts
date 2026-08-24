/**
 * InfluxDB 3 Cloud Serverless — SQL via `@influxdata/influxdb3-client` (Flight SQL).
 * Same database name as `client.query(sql, 'Groc')` in the official getting-started guide.
 * The legacy v1 HTTP `/query` + `db=` path requires a separate DBRP mapping and often fails with "database not found".
 */
import { InfluxDBClient, collectAll, HttpError } from '@influxdata/influxdb3-client';
import { env } from '$env/dynamic/private';
const { INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_DATABASE } = env

let client: InfluxDBClient | undefined;

function getClient(): InfluxDBClient {
	if (!client) {
		client = new InfluxDBClient({
			host: INFLUXDB_URL,
			token: INFLUXDB_TOKEN
		});
	}
	return client;
}

/** Escape content for use inside a SQL string literal (single quotes). */
export function escapeSqlStringLiteral(s: string): string {
	return s.replace(/'/g, "''");
}

/** Single-quoted table/measurement name for SQL: FROM 'product' */
export function sqlQuotedIdent(ident: string): string {
	return `'${escapeSqlStringLiteral(ident)}'`;
}

export async function runInfluxSqlQuery(
	sql: string
): Promise<
	{ ok: true; rows: Record<string, unknown>[] } | { ok: false; status: number; body: string }
> {
	try {
		const gen = getClient().query(sql, INFLUXDB_DATABASE, { type: 'sql' });
		const rows = await collectAll(gen);
		return { ok: true, rows };
	} catch (e: unknown) {
		if (e instanceof HttpError) {
			return {
				ok: false,
				status: e.statusCode,
				body: (e.body ?? e.message ?? '').toString().slice(0, 2000)
			};
		}
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, status: 500, body: msg };
	}
}
