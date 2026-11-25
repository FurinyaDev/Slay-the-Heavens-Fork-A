import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('formal native Host protects the player path using the release generation profile', t => {
  const result = spawnSync(process.execPath, ['scripts/runtime-baseline/production.mjs'], {
    encoding: 'utf8', timeout: 360_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(readFileSync('build/performance-regression/production.json', 'utf8'));
  assert.equal(report.status, 'OFFLINE_HOST_PASS');
  assert.equal(report.officialClient, 'UNVERIFIED');
  assert.equal(report.samples.length, 3);
  assert.match(report.sourceCommit, /^[a-f0-9]{40}$/);
  assert.match(report.sourceTree, /^[a-f0-9]{40}$/);
  assert.match(report.generatedLuaSha256, /^[a-f0-9]{64}$/);
  assert.match(result.stdout, /STS_UI_CLOSEOUT_PASS/);
  t.diagnostic(result.stdout.trim());
});
