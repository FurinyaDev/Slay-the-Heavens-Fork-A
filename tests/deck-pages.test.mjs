import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import test from 'node:test';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData} from '../scripts/build-lua-data.mjs';

test('the production card browser retains ten independent faces and retires input with each page', t => {
  const generated = mkdtempSync(join(tmpdir(), 'deck-pages-'));
  t.after(() => rmSync(generated, {recursive: true, force: true}));
  buildLuaData('data', join(generated, 'abyss_data.lua'));
  buildUI(generated, undefined, {officialAssets: true, nativePageLifecycle: true});
  const layout = JSON.parse(readFileSync(join(generated, 'game-ui.json'), 'utf8'));
  const panel = layout.controls.find(c => c.name === 'stage').children.find(c => c.name === 'deckPanel');
  const find = name => panel.children.find(c => c.name === name);
  const cardBottom = find('pileGrid').position[1] - 81.5 - 210 / 2;
  const foot = find('browserDescription');
  assert.ok(foot.position[1] + foot.size[1] / 2 < cardBottom, 'footer must clear the second row');
  assert.ok(find('previous').position[0] + find('previous').size[0] / 2 < -find('rarityTip').size[0] / 2);
  assert.ok(find('next').position[0] - find('next').size[0] / 2 > find('rarityTip').size[0] / 2);
  for (const control of [foot, find('rarityTip'), find('pageHint')]) {
    assert.ok(control.size[1] >= control.text.fontSize * 1.45 + 4, control.name + ' must fit a native line');
  }
  const theme = JSON.parse(readFileSync(join(generated, 'official-assets-theme.json'), 'utf8'));
  const heading = find('pileChrome').children.find(c => c.name === 'heading');
  const [headingWidth, headingHeight] = heading.size;
  const headingY = heading.position[1];
  const pileGrid = find('pileGrid');
  const hudBottom = theme.canvas.base[1] / 2 - theme.officialAssets.battleHud.height;
  assert.ok(headingY + headingHeight / 2 < hudBottom, 'heading must clear the HUD');
  assert.ok(headingY - headingHeight / 2 > pileGrid.position[1] + pileGrid.size[1] / 2,
    'heading must clear the first card row and its input region');
  for (const [width, height] of [...Object.values(theme.canvas.devices), [2048, 1171]]) {
    const scale = Math.min(width / theme.canvas.base[0], height / theme.canvas.base[1]);
    assert.ok((headingWidth / 2 + theme.canvas.safe.x) * scale <= width / 2);
    assert.ok((headingY + headingHeight / 2 + theme.canvas.safe.y) * scale <= height / 2);
    assert.ok(3 * heading.text.fontSize * scale <= headingWidth * scale);
    assert.ok((heading.text.fontSize * 1.45 + 4) * scale <= headingHeight * scale);
  }
  for (const name of ['previous', 'next']) {
    const button = find(name);
    assert.ok(button.position[1] - button.size[1] / 2 >= -theme.canvas.base[1] / 2 + theme.canvas.safe.y);
  }
  const require = createRequire(import.meta.url);
  const run = spawnSync(process.execPath, [require.resolve('fengari-node-cli/src/lua-cli.js'), '-e',
    "dofile('tests/lua/support/deck_browser_cases.lua')"], {
      encoding: 'utf8', timeout: 60_000,
      env: {...process.env, LUA_PATH: `${generated.replaceAll('\\','/')}/?.lua;src/lua/?.lua;;`},
    });
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /DECK_PAGES_PASS/);
});
