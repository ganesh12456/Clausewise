import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setupLocal } from '../scripts/setup-local.mjs';
import { validPassword } from '../lib/session.ts';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = await mkdtemp(path.join(tmpdir(), 'clausewise-local-'));
const previousHash = process.env.OWNER_PASSWORD_HASH;
try {
  const file = path.join(directory, '.env.local');
  await assert.rejects(setupLocal(directory, 'short'), /at least 16/);
  await assert.rejects(access(file));
  const password = 'local-test-password-123';
  await setupLocal(directory, password);
  const content = await readFile(file, 'utf8');
  const values = Object.fromEntries(content.split('\n').filter(line => line && !line.startsWith('#')).map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1)];
  }));
  const url = new URL(values.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '55432');
  assert.equal(url.password, values.LOCAL_POSTGRES_PASSWORD);
  assert.equal(values.APP_URL, 'http://localhost:3000');
  assert.equal(values.OWNER_EMAIL, 'owner@clausewise.local');
  process.env.OWNER_PASSWORD_HASH = values.OWNER_PASSWORD_HASH;
  assert.equal(validPassword(password), true);
  assert.equal(validPassword('incorrect-password'), false);
  assert.equal(content.includes(password), false);
  assert.match(values.SESSION_SECRET, /^[a-f0-9]{64}$/);
  if (process.platform !== 'win32') assert.equal((await stat(file)).mode & 0o777, 0o600);
  await assert.rejects(setupLocal(directory, 'another-password-123'), { code: 'EEXIST' });
  assert.equal(await readFile(file, 'utf8'), content);
  const blocked = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/migrate-local.mjs', import.meta.url))], {
    env: { ...process.env, DATABASE_URL: 'postgresql://test:test@example.invalid/clausewise' },
    encoding: 'utf8',
  });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /Local migrations require a localhost/);
  console.log('Local setup: authentication, localhost connection, private settings and overwrite protection passed');
} finally {
  if (previousHash === undefined) delete process.env.OWNER_PASSWORD_HASH;
  else process.env.OWNER_PASSWORD_HASH = previousHash;
  await rm(directory, { recursive: true, force: true });
}
