import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';

const hypertables = [
  {
    name: 'public.value_at_times',
    columns: [
      'product_id',
      '"time"',
      'unit_price',
      'unit_price_quantity',
      'unit_price_unit_of_measurement',
      'size',
      'price',
    ],
  },
];

// uses docker compose to dump a psql file
try {
  const execFileAsync = promisify(execFile);

  const { stdout: tableData } = await execFileAsync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'pg_dump',
      '-U', process.env.DB_USER!,
      '-d', process.env.DB_DATABASE!,
      '--data-only',
      '--exclude-schema=_timescaledb_catalog',
      '--exclude-schema=_timescaledb_internal',
      ...hypertables.flatMap(({ name }) => ['--exclude-table', name]),
    ],
    {
      maxBuffer: 500 * 1024 * 1024
    }
  );

  const hypertableData = await Promise.all(hypertables.map(async ({ name, columns }) => {
    const { stdout } = await execFileAsync(
      'docker',
      [
        'compose',
        'exec',
        '-T',
        'postgres',
        'psql',
        '-X',
        '-q',
        '-v', 'ON_ERROR_STOP=1',
        '-U', process.env.DB_USER!,
        '-d', process.env.DB_DATABASE!,
        '-c', `\\copy (SELECT ${columns.join(', ')} FROM ${name} ORDER BY product_id, "time") TO STDOUT WITH (FORMAT csv)`,
      ],
      {
        maxBuffer: 500 * 1024 * 1024,
      }
    );

    return `COPY ${name} (${columns.join(', ')}) FROM stdin WITH (FORMAT csv);\n${stdout}\\.\n`;
  }));

  const seed = `${tableData}\n${hypertableData.join('\n')}`;

  // find out what the latest migration was
  const migrationFiles = await readdir(new URL("../migrations/", import.meta.url));
  const lastMigrationFile = migrationFiles.sort().at(-1);

  const match = lastMigrationFile?.match(/^(\d+)\.migration\.sql$/);
  const lastMigrationNumber = match ? match[1] : undefined;

  if (lastMigrationNumber) {
    await writeFile(new URL(`../seed/${lastMigrationNumber}/${(new Date()).getTime()}`, import.meta.url), seed);
  } else {
    await writeFile(new URL(`../seed/baseSchema/${(new Date()).getTime()}`, import.meta.url), seed);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
