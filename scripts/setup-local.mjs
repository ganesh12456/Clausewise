import { randomBytes, scryptSync } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function setupLocal(directory, password) {
  if (password.length < 16) throw new Error('Use a password of at least 16 characters.');
  const salt = randomBytes(16).toString('hex');
  const databasePassword = randomBytes(24).toString('hex');
  const values = {
    DATABASE_URL: `postgresql://clausewise:${databasePassword}@127.0.0.1:55432/clausewise`,
    LOCAL_POSTGRES_PASSWORD: databasePassword,
    APP_URL: 'http://localhost:3000',
    OWNER_EMAIL: 'owner@clausewise.local',
    OWNER_PASSWORD_HASH: `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
    SESSION_SECRET: randomBytes(32).toString('hex'),
  };
  const content = '# Generated for local testing. Keep private; do not commit.\n' +
    Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
  // Never replace an existing environment: its database password and key must stay stable.
  await writeFile(path.join(directory, '.env.local'), content, { flag: 'wx', mode: 0o600 });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('Local testing setup. The password you type will be visible in this private terminal.');
    const password = await terminal.question('Choose your local login password (16+ characters): ');
    await setupLocal(fileURLToPath(new URL('../', import.meta.url)), password);
    console.log('Created .env.local with fresh database and session secrets.');
    console.log('Login email: owner@clausewise.local');
    console.log('Start Docker Desktop, then run: npm run local:dev');
  } catch (error) {
    console.error(error.code === 'EEXIST'
      ? '.env.local already exists and was preserved. Use it as configured; see docs/LOCAL_TESTING.md.'
      : error.message);
    process.exitCode = 1;
  } finally {
    terminal.close();
  }
}
