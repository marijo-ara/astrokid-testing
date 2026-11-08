import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadEnvLocal } from './load-env-local.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const envLocal = path.join(repoRoot, 'Web.E2E', '.env.local');

test('git ignores .env.local and does not track it', () => {
  const gitignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
  const rules = gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  assert.ok(rules.includes('.env.local'), '.gitignore must list .env.local');
  assert.ok(rules.includes('.env.*.local'), '.gitignore must list .env.*.local');

  const ignored = execFileSync('git', ['check-ignore', '-v', '--', 'Web.E2E/.env.local'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.match(ignored, /\.env\.local/);

  const tracked = execFileSync('git', ['ls-files', '--', 'Web.E2E/.env.local'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  assert.equal(tracked, '');
  assert.equal(fs.existsSync(envLocal), true);
});

test('loadEnvLocal fills missing keys and does not override the shell', () => {
  const file = path.join(os.tmpdir(), `astrokid-env-local-${process.pid}.env`);
  fs.writeFileSync(
    file,
    ['# comment', '', 'VERCEL_QA_PASSWORD=local-only', 'PLAYWRIGHT_ENV=qa', 'SKIP_ME=nope'].join('\n'),
    'utf8',
  );

  const previousPassword = process.env.VERCEL_QA_PASSWORD;
  const previousEnv = process.env.PLAYWRIGHT_ENV;
  const previousSkip = process.env.SKIP_ME;
  process.env.VERCEL_QA_PASSWORD = 'from-shell';
  delete process.env.PLAYWRIGHT_ENV;
  delete process.env.SKIP_ME;

  try {
    loadEnvLocal(file);
    assert.equal(process.env.VERCEL_QA_PASSWORD, 'from-shell');
    assert.equal(process.env.PLAYWRIGHT_ENV, 'qa');
    assert.equal(process.env.SKIP_ME, 'nope');
  } finally {
    fs.unlinkSync(file);
    restore('VERCEL_QA_PASSWORD', previousPassword);
    restore('PLAYWRIGHT_ENV', previousEnv);
    restore('SKIP_ME', previousSkip);
  }
});

test('loadEnvLocal replaces empty shell values from the file', () => {
  const file = path.join(os.tmpdir(), `astrokid-env-empty-${process.pid}.env`);
  fs.writeFileSync(file, 'VERCEL_QA_PASSWORD=file-value\n', 'utf8');
  const previous = process.env.VERCEL_QA_PASSWORD;
  process.env.VERCEL_QA_PASSWORD = '';
  try {
    loadEnvLocal(file);
    assert.equal(process.env.VERCEL_QA_PASSWORD, 'file-value');
  } finally {
    fs.unlinkSync(file);
    restore('VERCEL_QA_PASSWORD', previous);
  }
});

function restore(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
