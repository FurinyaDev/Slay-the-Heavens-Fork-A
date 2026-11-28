import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { luaString } from '../scripts/build-lua-data.mjs';

const require = createRequire(import.meta.url);
const child = (node, name) => node.children.find(control => control.name === name);

function runNode(cwd, args) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 60_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

function generate(t, flag, official) {
  const directory = mkdtempSync(join(tmpdir(), 'sth-ascension-selection-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const name of ['art', 'docs', 'experiments', 'tools']) {
    symlinkSync(resolve(name), join(directory, name), 'junction');
  }
  for (const name of ['CHANGELOG.md', 'package.json', 'package-lock.json', 'release-please-config.json', '.release-please-manifest.json']) {
    copyFileSync(name, join(directory, name));
  }
  const data = join(directory, 'data');
  mkdirSync(data);
  for (const entry of readdirSync('data', { withFileTypes: true })) {
    if (entry.name === 'rules.json') continue;
    const target = join(data, entry.name);
    const original = resolve('data', entry.name);
    if (entry.isDirectory()) symlinkSync(original, target, 'junction');
    else copyFileSync(original, target);
  }
  const rules = JSON.parse(readFileSync('data/rules.json', 'utf8'));
  writeFileSync(join(data, 'rules.json'), JSON.stringify({ ...rules, ascensionEnabled: flag }));
  runNode(directory, [resolve('scripts/build-ui.mjs'), 'ui', ...(official ? ['--official-assets'] : [])]);
  runNode(directory, [resolve('scripts/build-lua-data.mjs'), 'data', 'ui/abyss_data.lua']);
  return join(directory, 'ui');
}

function panel(output) {
  const { controls } = JSON.parse(readFileSync(join(output, 'game-ui.json'), 'utf8'));
  return child(controls.find(row => row.name === 'stage'), 'characterPanel');
}

test('disabled builds exclude the ascension controls', t => {
  assert.equal(child(panel(generate(t, false, true)), 'ascensionPicker'), undefined);
});

test('native ascension picker remains usable across supported viewport ratios', t => {
  const output = generate(t, true, true);
  const picker = child(panel(output), 'ascensionPicker');
  assert.ok(picker, 'enabled official UI omitted ascension picker');
  for (const width of [1280, 1560, 1600, 1680]) {
    for (const name of ['previous', 'next']) {
      const box = child(picker, name);
      const x = width / 2 + picker.position[0] + box.position[0];
      const y = 360 + picker.position[1] + box.position[1];
      assert.ok(x - box.size[0] / 2 >= 40 && x + box.size[0] / 2 <= width - 40);
      assert.ok(y - box.size[1] / 2 >= 20 && y + box.size[1] / 2 <= 700);
      assert.ok(box.size[0] >= 48 && box.size[1] >= 48);
    }
  }
});

test('real character screen opens at A0, protects locked choices, and starts with the selected difficulty', t => {
  const output = generate(t, true, false);
  const files = readdirSync(output).filter(name => name.endsWith('.lua'));
  const preloads = files.map(name => `package.preload[${luaString(name.slice(0, -4))}]=assert(loadfile(${luaString(join(output, name))}))`).join('\n');
  const source = `package.path='src/lua/?.lua;'..package.path
${preloads}
dofile('tests/lua/support/ascension_selection.lua')`;
  assert.match(runNode(process.cwd(), [require.resolve('fengari-node-cli/src/lua-cli.js'), '-e', source]), /ASCENSION_SELECTION_PASS/);
});
