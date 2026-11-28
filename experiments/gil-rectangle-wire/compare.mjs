import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { loadNativeUiEncoder } from '../../scripts/native-ui-encoder.mjs';

const [toolRoot, inputPath, uiName, output] = process.argv.slice(2);
if (!toolRoot || !inputPath || !uiName || !output || process.env.MILIASTRA_ALLOW_LIVE_WRITE !== '0') {
  throw Error('MILIASTRA_ALLOW_LIVE_WRITE=0 node compare.mjs <MCP root> <A.gil or audio/candidate.json> <UI name> <new output directory>');
}
const { container, field, fields, one, replace, wrap } = await import(pathToFileURL(resolve(toolRoot, 'src/scene/wire.mjs')));
const { native, identity } = await loadNativeUiEncoder(toolRoot);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fileIdentity = bytes => ({ bytes: bytes.length, sha256: sha256(bytes) });
const matches = (row, id, wire) => row.id === id && row.wire === wire;
const sourceReceipt = inputPath.endsWith('.json') ? JSON.parse(readFileSync(inputPath, 'utf8')) : undefined;
const aPath = resolve(sourceReceipt?.mapPath ?? inputPath);
const source = readFileSync(aPath);
const baseline = fileIdentity(source);
if (sourceReceipt) {
  assert.equal(sourceReceipt.candidate?.sha256, baseline.sha256, 'Input file SHA differs from source receipt');
  assert.equal(sourceReceipt.candidate?.bytes, baseline.bytes, 'Input file length differs from source receipt');
}

// Section 9 record 502 contains repeated component field 505. Component 12
// holds the rectangle at 503/13/12. On a recognized layout only this leaf changes.
function visitRect(row, visit) {
  if (!matches(row, 502, 2)) return row.raw;
  const record = fields(row.data);
  let found = false;
  let changed = false;
  const blocks = record.map(block => {
    if (!matches(block, 505, 2) || !fields(block.data).some(f => matches(f, 502, 0) && f.value === 12n)) return block.raw;
    assert(!found, 'Control has multiple rectangle components');
    found = true;
    const nested = one(block.data, 503);
    const outer = one(nested, 13);
    const before = one(outer, 12);
    const after = visit(before);
    if (before.equals(after)) return block.raw;
    changed = true;
    return field(505, 2, replace(block.data, 503, 2, replace(nested, 13, 2, replace(outer, 12, 2, after))));
  });
  return changed ? field(502, 2, Buffer.concat(blocks)) : row.raw;
}

function rewrite(bytes, visit) {
  const root = container(bytes);
  const ui = one(root, 9);
  return wrap(bytes, replace(root, 9, 2, Buffer.concat(fields(ui).map(row => visitRect(row, visit)))));
}

function syncStateRows(rect) {
  const components = fields(rect);
  const flags = components.filter(row => row.id === 504);
  const states = components.filter(row => row.id === 501);
  if (flags.length !== 1 || !matches(flags[0], 504, 0) || flags[0].value !== 1n || !states.every(row => matches(row, 501, 2))) return [];
  if (!states.every((row, index) => row === components[index])) return [];
  return states;
}

function body(row, index) {
  const parts = fields(row.data);
  if (parts.length !== (index ? 2 : 1)) return undefined;
  if (index && (!matches(parts[0], 501, 0) || parts[0].value !== BigInt(index))) return undefined;
  const value = parts.at(-1);
  return matches(value, 502, 2) ? value.data : undefined;
}

let compacted = 0;
let preexistingSparse = 0;
let visited = 0;
let distinctSynchronized = 0;
const candidate = rewrite(source, rect => {
  visited++;
  const states = syncStateRows(rect);
  if (states.length === 1) preexistingSparse++;
  if (states.length !== 4) return rect;
  const primary = body(states[0], 0);
  if (!primary || !states.slice(1).every((row, index) => body(row, index + 1)?.equals(primary))) {
    distinctSynchronized++;
    return rect;
  }
  compacted++;
  const stateBytes = states.reduce((sum, row) => sum + row.raw.length, 0);
  return Buffer.concat([states[0].raw, rect.subarray(stateBytes)]);
});
assert.equal(preexistingSparse, 0, 'Rollback ambiguity. Input already contains sparse synchronized rectangles.');
assert(compacted > 0 && candidate.length < source.length, 'Input has no compactable synchronized rectangles.');

let expanded = 0;
const restored = rewrite(candidate, rect => {
  const states = syncStateRows(rect);
  if (states.length !== 1) return rect;
  const primary = body(states[0], 0);
  assert(primary, 'Malformed sparse rectangle');
  expanded++;
  const deviceRows = [1, 2, 3].map(index => field(501, 2, Buffer.concat([field(501, 0, index), field(502, 2, primary)])));
  return Buffer.concat([states[0].raw, ...deviceRows, rect.subarray(states[0].raw.length)]);
});
assert.equal(expanded, compacted);
assert(restored.equals(source), 'Restored bytes differ');

const outsideUi = bytes => fields(container(bytes)).filter(row => row.id !== 9).map(row => row.raw);
assert.deepEqual(outsideUi(candidate), outsideUi(source), 'A non-UI section changed');
const normalize = ({ mapPath, ...decoded }) => decoded;
const readUi = mapPath => normalize(native.getClientUi({ mapPath, ui: uiName }));
const aUi = readUi(aPath);
const aInventory = normalize(native.listInterface({ mapPath: aPath }));
const scratch = mkdtempSync(join(tmpdir(), 'gil-rectangle-'));
const probeName = 'sparse-rectangle-probe.gil';
try {
  const bPath = join(scratch, probeName);
  writeFileSync(bPath, candidate, { flag: 'wx' });
  assert.deepEqual(readUi(bPath), aUi, 'Normalized main layout changed');
  assert.deepEqual(normalize(native.listInterface({ mapPath: bPath })), aInventory, 'Interface inventory changed');
  for (const { name: template } of aInventory.clientTemplates) {
    const readTemplate = mapPath => normalize(native.getClientUi({ mapPath, template }));
    assert.deepEqual(readTemplate(bPath), readTemplate(aPath), `Normalized template changed: ${template}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
let count = 0;
const walk = node => {
  count++;
  for (const child of node.children ?? []) walk(child);
};
for (const control of aUi.interface.controls) walk(control);
const uiBytes = bytes => fields(container(bytes)).find(row => matches(row, 9, 2)).raw.length;
const receipt = {
  schemaVersion: 1,
  purpose: 'Offline experimental copy. Sparse synchronized rectangles require official import and device verification.',
  baseline: { ...baseline, uiBytes: uiBytes(source), gzipBytes: gzipSync(source).length },
  sparseProbe: { ...fileIdentity(candidate), uiBytes: uiBytes(candidate), gzipBytes: gzipSync(candidate).length },
  ...(sourceReceipt ? { baselineBuild: { sourceCommit: sourceReceipt.sourceCommit, buildId: sourceReceipt.buildId,
    sourceDirty: sourceReceipt.sourceDirty, payloadDigest: sourceReceipt.payloadDigest,
    profile: sourceReceipt.officialAssetsProfile, workKey: sourceReceipt.release?.workKey } } : {}),
  byteSavings: source.length - candidate.length,
  visitedRectangleRecords: visited,
  compactedRectangleRecords: compacted,
  untouchedRectangleRecords: visited - compacted,
  distinctSynchronizedRectangleRecords: distinctSynchronized,
  uiName,
  mainLayoutControls: count,
  templateDefinitions: aInventory.clientTemplates.length,
  checks: { reversal: 'BYTE_EXACT', nonUiFields: 'BYTE_EXACT', mainLayoutMcpReadback: 'DEEP_EQUAL', templateMcpReadback: 'DEEP_EQUAL',
    officialImport: 'UNVERIFIED', officialCapacity: 'UNVERIFIED', officialReady: 'UNVERIFIED', devices: 'UNVERIFIED' },
  node: process.version,
  nativeEncoderSha256: identity.sourceSha256,
};
assert.equal(sha256(readFileSync(aPath)), receipt.baseline.sha256, 'Input changed during experiment');
const destination = resolve(output);
mkdirSync(destination);
try {
  writeFileSync(join(destination, probeName), candidate, { flag: 'wx' });
  writeFileSync(join(destination, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
} catch (error) {
  rmSync(destination, { recursive: true, force: true });
  throw error;
}
console.log(JSON.stringify(receipt));
