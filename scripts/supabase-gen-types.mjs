import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const poolerUrlPath = resolve(projectRoot, 'supabase/.temp/pooler-url');
const outputFilePath = resolve(projectRoot, 'src/types/database.types.ts');
const envFilePath = resolve(projectRoot, '.env.local');

function readEnvFileValue(key) {
  try {
    const raw = readFileSync(envFilePath, 'utf8');
    const line = raw
      .split('\n')
      .find((item) => item.trim().startsWith(`${key}=`));

    if (!line) {
      return null;
    }

    const value = line.slice(line.indexOf('=') + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value || null;
  } catch {
    return null;
  }
}

function runSupabase(args, options = {}) {
  return spawnSync('pnpm', ['exec', 'supabase', ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    ...options,
  });
}

function writeTypesFile(contents) {
  writeFileSync(outputFilePath, contents);
  console.log(`Generated ${outputFilePath}`);
}

function tryGenerateWithLinkedProject() {
  const result = runSupabase(
    ['gen', 'types', '--linked', '--lang', 'typescript', '--schema', 'public'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (result.status === 0) {
    writeTypesFile(result.stdout);
    return true;
  }

  const stderr = result.stderr || '';
  const stdout = result.stdout || '';
  const combinedOutput = `${stdout}\n${stderr}`.trim();

  console.warn('Linked type generation failed, falling back to direct database connection.');
  if (combinedOutput) {
    console.warn(combinedOutput);
  }

  return false;
}

function generateWithDbUrl() {
  const password =
    process.env.SUPABASE_POSTGRES_PASSWORD ??
    readEnvFileValue('SUPABASE_POSTGRES_PASSWORD') ??
    process.env.SUPABASE_DB_PASSWORD ??
    readEnvFileValue('SUPABASE_DB_PASSWORD');

  if (!password) {
    console.error(
      'Linked type generation failed, and no database password was found. Set SUPABASE_POSTGRES_PASSWORD in your shell or .env.local, then rerun `pnpm db:types:pull`.',
    );
    process.exit(1);
  }

  const rawPoolerUrl = readFileSync(poolerUrlPath, 'utf8').trim();
  const dbUrl = new URL(rawPoolerUrl);
  dbUrl.password = password;

  const result = runSupabase(
    ['gen', 'types', '--db-url', dbUrl.toString(), '--lang', 'typescript', '--schema', 'public'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (result.status === 0) {
    writeTypesFile(result.stdout);
    return;
  }

  const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`.trim();

  if (combinedOutput.toLowerCase().includes('docker daemon')) {
    console.error(
      'Direct database type generation requires Docker Desktop to be running. Start Docker, or make sure linked generation can access Supabase API.',
    );
  }

  if (combinedOutput) {
    console.error(combinedOutput);
  }

  process.exit(result.status ?? 1);
}

if (!tryGenerateWithLinkedProject()) {
  generateWithDbUrl();
}
