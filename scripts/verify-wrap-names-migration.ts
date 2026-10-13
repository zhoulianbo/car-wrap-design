/** Isolated SQLite fixture: migration preserves review names and is safe to rerun. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

const directory = mkdtempSync(join(tmpdir(), 'wrap-names-'));
const url = `file:${join(directory, 'test.db')}`;
let client = createClient({ url });
try {
  await client.executeMultiple(`
    CREATE TABLE user_wrap(id TEXT PRIMARY KEY, vehicle_slug TEXT, generation_id TEXT, version INTEGER, updated_at INTEGER);
    CREATE TABLE ai_generation(id TEXT PRIMARY KEY, prompt TEXT);
    CREATE TABLE design(source_wrap_id TEXT, title TEXT, deleted_at INTEGER, updated_at INTEGER);
    INSERT INTO ai_generation VALUES ('en','Bright ocean racing stripes'),('zh','深色赛车涂装，一条亮色条纹');
    INSERT INTO user_wrap VALUES ('latin','model-3-legacy','en',2,123),('chinese','model-3-legacy','zh',1,456),('reviewed','model-3-legacy','en',3,789),('manual','model-3-legacy',NULL,1,999);
    INSERT INTO design VALUES ('reviewed','Reviewer title',NULL,123);
  `);
  const run = (...args: string[]) =>
    execFileSync(
      process.execPath,
      [
        '--import',
        'tsx',
        'scripts/migrate-wrap-names.ts',
        `--database=${url}`,
        ...args,
      ],
      { encoding: 'utf8' }
    );
  run();
  assert.ok(
    !(await client.execute('PRAGMA table_info(user_wrap)')).rows.some(
      (row) => row.name === 'name'
    )
  );
  run('--apply');
  client.close();
  client = createClient({ url });
  const rows = (await client.execute('SELECT * FROM user_wrap ORDER BY id'))
    .rows;
  assert.deepEqual(
    rows.map((row) => row.name),
    ['深色赛车涂装，一', 'Bright ocean', 'Model 3 Wrap', 'Reviewer title']
  );
  assert.deepEqual(
    rows.map((row) => [row.version, row.updated_at]),
    [
      [1, 456],
      [2, 123],
      [1, 999],
      [3, 789],
    ]
  );
  const backups = readdirSync(directory).filter((name) =>
    name.endsWith('.bak')
  );
  assert.equal(backups.length, 1);
  const backup = createClient({ url: `file:${join(directory, backups[0])}` });
  assert.ok(
    !(await backup.execute('PRAGMA table_info(user_wrap)')).rows.some(
      (row) => row.name === 'name'
    )
  );
  backup.close();
  await client.execute(
    "UPDATE user_wrap SET name = 'Edited later' WHERE id = 'latin'"
  );
  run('--apply');
  assert.equal(
    (await client.execute("SELECT name FROM user_wrap WHERE id = 'latin'"))
      .rows[0].name,
    'Edited later'
  );
  assert.equal(
    readdirSync(directory).filter((name) => name.endsWith('.bak')).length,
    1
  );
  console.log(
    'PASS: dry run, backup, AI/manual/reviewed backfill, stable timestamps/version and idempotent rerun.'
  );
} finally {
  client.close();
}
