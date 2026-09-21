import { env } from '$env/dynamic/private';
import {
	makeConnectionPool,
	PostgresCategoryRepository,
	PostgresProductRepository,
	type CategoryRepository,
	type ProductRepository
} from '@grocery-tracker/db';
import { loadConfig } from '@grocery-tracker/utils';

const FRONTEND_POOL_MAX = 5;

let pool: ReturnType<typeof makeConnectionPool> | undefined;

function getPool(): ReturnType<typeof makeConnectionPool> {
	if (!pool) {
		const config = loadConfig(env.CONFIG_PATH);
		pool = makeConnectionPool({ ...config.database, max: FRONTEND_POOL_MAX });
	}

	return pool;
}

export function getProductRepository(): ProductRepository {
	return new PostgresProductRepository(getPool());
}

export function getCategoryRepository(): CategoryRepository {
	return new PostgresCategoryRepository(getPool());
}
