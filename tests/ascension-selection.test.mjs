import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { luaString } from '../scripts/build-lua-data.mjs';

const require = createRequire(import.meta.url);
const child = (node, name) => node.children?.find(control => control.name === name);

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

function stage(output) {
  const { controls } = JSON.parse(readFileSync(join(output, 'game-ui.json'), 'utf8'));
  return controls.find(row => row.name === 'stage');
}

function runLua(output, script) {
  const files = readdirSync(output).filter(name => name.endsWith('.lua'));
  const preloads = files.map(name => `package.preload[${luaString(name.slice(0, -4))}]=assert(loadfile(${luaString(join(output, name).replaceAll('\\', '/'))}))`).join('\n');
  const source = `package.path='src/lua/?.lua;'..package.path
${preloads}
dofile(${luaString(script)})`;
  return runNode(process.cwd(), [require.resolve('fengari-node-cli/src/lua-cli.js'), '-e', source]);
}

test('disabled builds exclude the ascension and seed controls', t => {
  const layout = stage(generate(t, false, true));
  const selection = child(layout, 'characterPanel');
  for (const id of ['ascensionPicker', 'seedEntry', 'seedEditor']) assert.equal(child(selection, id), undefined);
  assert.equal(child(child(layout, 'runMenu'), 'runSeedDetails'), undefined);
});

test('native difficulty and seed controls are touchable across supported viewport ratios', t => {
  const output = generate(t, true, true);
  const layout = stage(output);
  const selection = child(layout, 'characterPanel');
  const picker = child(selection, 'ascensionPicker');
  const editor = child(selection, 'seedEditor');
  assert.ok(picker, 'enabled official UI omitted ascension picker');
  assert.ok(editor, 'enabled official UI omitted seed editor');
  const actions = [
    [picker.position, child(picker, 'previous')], [picker.position, child(picker, 'next')],
    [[0, 0], child(selection, 'seedEntry')],
    ...editor.children.filter(row => child(row, 'hit')).map(row => [[0, 0], row]),
  ];
  for (const width of [1280, 1560, 1600, 1680]) {
    for (const [offset, box] of actions) {
      const x = width / 2 + offset[0] + box.position[0];
      const y = 360 + offset[1] + box.position[1];
      assert.ok(x - box.size[0] / 2 >= 40 && x + box.size[0] / 2 <= width - 40);
      assert.ok(y - box.size[1] / 2 >= 20 && y + box.size[1] / 2 <= 700);
      assert.ok(box.size[0] >= 48 && box.size[1] >= 48);
    }
  }
  const menu = child(layout, 'runMenu');
  const details = child(menu, 'runSeedDetails');
  const menuCommand = child(menu, 'mainMenu');
  assert.ok(details.position[0] + details.size[0] / 2 < menuCommand.position[0] - menuCommand.size[0] / 2,
    'seed details overlap the pause menu controls');
});

test('real character screen opens at A0, protects locked choices, and starts with the selected difficulty', t => {
  const output = generate(t, true, false);
  assert.match(runLua(output, 'tests/lua/support/ascension_selection.lua'), /ASCENSION_SELECTION_PASS/);
});

test('seed editor handles signed64 limits, rejects overflow, and applies only confirmed input', t => {
  const output = generate(t, true, false);
  assert.match(runLua(output, 'tests/lua/support/ascension_seed_editor.lua'), /ASCENSION_SEED_EDITOR_PASS/);
});

test('run menu shows the complete run seed and reproducibility details', t => {
  const output = generate(t, true, false);
  assert.match(runLua(output, 'tests/lua/support/ascension_run_seed_display.lua'), /ASCENSION_RUN_SEED_DISPLAY_PASS/);
});

test('confirmation submits the visible difficulty through a transient progress read failure', t => {
  const output = generate(t, true, false);
  assert.match(runLua(output, 'tests/lua/support/ascension_confirmation_choice.lua'), /ASCENSION_CONFIRMATION_CHOICE_PASS/);
});
