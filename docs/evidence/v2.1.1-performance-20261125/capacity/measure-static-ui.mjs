import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

const [toolRoot, receiptPath, output, blocks = '2'] = process.argv.slice(2);
if (!toolRoot || !receiptPath || !output || typeof global.gc !== 'function' || !/^([1-9]|10)$/.test(blocks)) {
  throw Error('Usage: node --expose-gc measure-static-ui.mjs <MCP root> <audio/candidate.json> <output> [1-10 Latin square blocks]');
}
const imp = path => import(pathToFileURL(resolve(toolRoot, path)));
const {container, field, fields, one, replace, varint, wrap} = await imp('src/scene/wire.mjs');
const {getClientUi} = await imp('src/scene-save.mjs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const source = readFileSync(receipt.mapPath);
assert.equal(sha(source), receipt.candidate.sha256);
const layout = JSON.parse(readFileSync(resolve(receipt.sourceReceipt.path, '../', receipt.productionManifest.layout.path), 'utf8'));
const full = getClientUi({mapPath: receipt.mapPath, ui: layout.name});
const stageId = full.ids.stage;
const stage = full.interface.controls.find(node => node.name === 'stage');
const dropped = [[], ['nodePanel'], ['nodePanel', 'battlePanel'],
  ['nodePanel', 'battlePanel', 'mapPanel', 'deckPanel', 'relicBar', 'relicPanel', 'characterPanel']];
const orders = [[0,1,3,2],[1,2,0,3],[2,3,1,0],[3,0,2,1]];
const scratch = mkdtempSync(join(tmpdir(), 'abyss-static-load-'));
const root = container(source);
const originalTopFields = fields(root);
const ui = one(root, 9);
const controls = node => 1 + (node.children ?? []).reduce((sum, child) => sum + controls(child), 0);
const count = tree => tree.controls.reduce((sum, node) => sum + controls(node), 0);
const fullCount = count(full.interface);

function packedIds(bytes) {
  const ids = [];
  let value = 0, shift = 0;
  for (const byte of bytes) {
    assert(shift <= 49, 'Invalid id');
    value += (byte & 127) * 2 ** shift;
    if (byte & 128) {
      shift += 7;
    } else {
      assert(Number.isSafeInteger(value) && value > 0, 'Invalid id');
      ids.push(value);
      value = 0;
      shift = 0;
    }
  }
  assert.equal(shift, 0, 'Truncated id');
  return ids;
}

function makeVariant(removed, index) {
  for (const name of removed) assert.equal(stage.children.find(child => child.name === name)?.visible, false, name);
  const gone = new Set(Object.entries(full.ids).filter(([key]) => removed.some(name => key === `stage/${name}` || key.startsWith(`stage/${name}/`))).map(([,id]) => id));
  const removedRoots = new Set(removed.map(name => full.ids[`stage/${name}`]));
  const data = index === 0 ? source : wrap(source, replace(root, 9, 2, Buffer.concat(fields(ui).flatMap(row => {
    if (row.id !== 502 || row.wire !== 2) return [row.raw];
    const id = Number(one(row.data, 501, 0));
    if (gone.has(id)) return [];
    if (id !== stageId) return [row.raw];
    const children = packedIds(one(row.data, 503));
    assert.equal(children.filter(value => removedRoots.has(value)).length, removedRoots.size);
    return [field(502, 2, replace(row.data, 503, 2, Buffer.concat(children.filter(child => !removedRoots.has(child)).map(varint))))];
  }))));
  const variantTop = fields(container(data));
  assert.equal(variantTop.length, originalTopFields.length);
  for (let i = 0; i < variantTop.length; i++) {
    assert.equal(variantTop[i].id, originalTopFields[i].id);
    if (variantTop[i].id !== 9) assert(variantTop[i].raw.equals(originalTopFields[i].raw), `Section ${variantTop[i].id} changed`);
  }
  const path = join(scratch, `case-${index}.gil`);
  writeFileSync(path, data);
  const decoded = getClientUi({mapPath: path, ui: layout.name});
  const observed = count(decoded.interface);
  assert.equal(observed, fullCount - gone.size);
  assert.equal(decoded.interface.controls.find(node => node.name === 'stage').children.find(node => node.name === 'menuPanel').visible,
    stage.children.find(node => node.name === 'menuPanel').visible);
  return {index, path, sha256: sha(data), fileBytes: data.length, uiSectionBytes: variantTop.find(f => f.id === 9).raw.length,
    controls: observed, removedRoots: removed, removedRecords: gone.size};
}

function probe(variant, block, round, position) {
  global.gc();
  const heapBefore = process.memoryUsage().heapUsed;
  const before = process.cpuUsage();
  const started = performance.now();
  const result = getClientUi({mapPath: variant.path, ui: layout.name});
  const elapsedMs = performance.now() - started;
  const elapsedCpu = process.cpuUsage(before);
  const heapAfter = process.memoryUsage().heapUsed;
  assert.equal(count(result.interface), variant.controls);
  return {block, round, position, variant: variant.index, controls: variant.controls, elapsedMs,
    cpuMs: (elapsedCpu.user + elapsedCpu.system) / 1000, heapBefore, heapAfter,
    heapAfterMinusBefore: heapAfter - heapBefore, rssAfter: process.memoryUsage.rss()};
}

function csv(headers, rows) {
  return `${headers.join(',')}\n${rows.map(row => headers.map(header => row[header]).join(',')).join('\n')}\n`;
}
const median = values => {
  const ordered = values.toSorted((a,b) => a-b), middle = ordered.length / 2;
  return ordered.length % 2 ? ordered[Math.floor(middle)] : (ordered[middle - 1] + ordered[middle]) / 2;
};

function chart(summary) {
  const x = controls => 99 + controls / Math.max(...summary.map(row => row.controls))*640;
  const ymax = 1.1*Math.max(...summary.map(row=>row.wallMs.max));
  const y = ms => 354 - ms/ymax*258;
  const marks = summary.map(row=>`<g><title>${row.controls} controls, median ${row.wallMs.p50.toFixed(2)} ms, max ${row.wallMs.max.toFixed(2)} ms</title><line x1="${x(row.controls)}" y1="${y(row.wallMs.p50)}" x2="${x(row.controls)}" y2="${y(row.wallMs.max)}" stroke="#8cb7ba" stroke-width="2"/><circle cx="${x(row.controls)}" cy="${y(row.wallMs.p50)}" r="6" fill="#147577"/><text x="${x(row.controls)}" y="${y(row.wallMs.p50)-9}" text-anchor="middle" font-size="12">${row.wallMs.p50.toFixed(1)}</text><text x="${x(row.controls)}" y="372" text-anchor="middle" font-size="12">${row.controls.toLocaleString('en-US')}</text></g>`).join('');
  const ticks = Array.from({length:5},(_,i)=>{const ms=ymax*i/5;return `<line x1="99" x2="764" y1="${y(ms)}" y2="${y(ms)}" stroke="#cfdde6"/><text x="87" y="${y(ms)+4}" text-anchor="end" font-size="12">${ms.toFixed(0)}</text>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="810" height="423" viewBox="0 0 810 423" role="img" aria-labelledby="title"><title id="title">Static control count and offline binary readback time</title><rect width="100%" height="100%" fill="#f7f9fc"/><g fill="#17293b" font-family="system-ui, sans-serif"><text x="32" y="37" font-size="21" font-weight="700">Static control count and offline UI readback</text><text x="32" y="60" font-size="13">Same native comparison fixture · Node/MCP parser · n=${summary[0].n} per count · dots P50, lines to max</text><text x="32" y="88" font-size="12">Elapsed ms</text>${ticks}${marks}<text x="444" y="402" text-anchor="middle" font-size="13">Layout controls</text></g></svg>\n`;
}

try {
  mkdirSync(output, {recursive: true});
  const variants = dropped.map(makeVariant);
  const samples = [];
  for (let block = 0; block < Number(blocks); block++) {
    for (const [round, order] of orders.entries()) {
      order.forEach((index, position) => samples.push(probe(variants[index], block, round, position)));
    }
  }
  const measurement = (rows, key) => ({p50: median(rows.map(row => row[key])), max: Math.max(...rows.map(row => row[key]))});
  const summary = variants.map(({path, ...variant}) => {
    const rows = samples.filter(row => row.variant === variant.index);
    return {...variant, n: rows.length, wallMs: measurement(rows,'elapsedMs'), cpuMs: measurement(rows,'cpuMs'), heapDeltaBytes: measurement(rows,'heapAfterMinusBefore')};
  });
  writeFileSync(join(output,'static-ui-dose.json'), JSON.stringify({method: 'Actual fixture native GIL, diagnostic copies with whole hidden UI branches removed. Linux Node MCP reading native layout, including file read; no rendering, compilation, Lua or playback.', sourceCommit: receipt.sourceCommit, buildId: receipt.buildId, sourceGilSha256: sha(source), node: process.version, probes: samples.length, latinSquareOrders: orders, summary},null,2)+'\n');
  writeFileSync(join(output,'static-ui-dose.csv'), csv(Object.keys(samples[0]),samples));
  writeFileSync(join(output,'static-ui-dose.svg'),chart(summary));
} finally {
  rmSync(scratch, {recursive: true, force: true});
}
