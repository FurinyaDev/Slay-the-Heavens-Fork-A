import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [toolRoot, file, receiptFile, output, comparison] = process.argv.slice(2);
assert(output, 'Usage: node measure-published-gil.mjs <MCP root> <GIL> <archive or audio candidate receipt> <output dir> [public-fixture capacity.json]');
const load = path => import(pathToFileURL(resolve(toolRoot, path)));
const {container, fields, one} = await load('src/scene/wire.mjs');
const {getClientUi, getLevelSettings, listInterface} = await load('src/scene-save.mjs');
const {inspectFile} = await load('src/adapter.mjs');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sum = (rows, fn) => rows.reduce((total, row) => total + fn(row), 0);
const parse = (data, position) => fields(data).map(row => {
  const start = position;
  position += row.raw.length;
  return {...row, start, end: position, dataStart: position - (row.data?.length ?? 0)};
});
const child = (data, id) => data && fields(data).find(row => row.id === id && row.wire === 2)?.data;
const numeric = (data, id) => data && fields(data).find(row => row.id === id && row.wire === 0)?.value;
const sameType = (data, id, code) => fields(data).filter(row => row.id === id && row.wire === 2).find(row => numeric(row.data, 502) === BigInt(code))?.data;
const text = (data, id) => one(data, id).toString('utf8');
const names = ['nativeUi', 'templates', 'lua', 'art', 'audio', 'other'];
const artNames = new Set(['abyss_monster_art_data', 'abyss_traveler_portrait_assets']);
const bgmName = '_GSTS_ABYSS_BGM';

const receiptBytes = readFileSync(receiptFile);
const receipt = JSON.parse(receiptBytes);
const isLocalCandidate = Boolean(receipt.candidate);
const fileIdentity = receipt.candidate ?? receipt;
const hex = (value, size) => typeof value === 'string' && value.length === size && /^[0-9a-f]+$/.test(value);
assert(hex(receipt.sourceCommit, 40), 'Missing source commit');
assert(hex(fileIdentity.sha256, 64), 'Missing candidate digest');
const gil = readFileSync(file);
assert.equal(gil.length, fileIdentity.bytes);
assert.equal(sha(gil), fileIdentity.sha256);
assert.equal(receipt.sourceDirty, false);
const expectedScripts = new Map();
let inputBase;
if (isLocalCandidate) {
  assert(hex(receipt.payloadDigest, 64), 'Missing candidate payload digest');
  assert.equal(fileIdentity.sha256, receipt.sha256);
  const sourceReceiptPath = resolve(dirname(resolve(receiptFile)), receipt.sourceReceipt.path);
  const sourceReceiptBytes = readFileSync(sourceReceiptPath);
  assert.equal(sourceReceiptBytes.length, receipt.sourceReceipt.bytes);
  assert.equal(sha(sourceReceiptBytes), receipt.sourceReceipt.sha256);
  const full = JSON.parse(sourceReceiptBytes);
  for (const key of ['sourceCommit', 'sourceDirty', 'buildId', 'payloadDigest', 'nativeScriptStorage']) {
    assert.deepEqual(receipt[key], full[key], key);
  }
  assert.equal(receipt.baseSha256, full.candidate.sha256);
  assert.equal(receipt.baseAfter, full.candidate.sha256);
  assert.equal(full.statuses.staticCheck, 'pass');
  inputBase = {bytes: full.baseMap.bytes, sha256: full.baseMap.sha256};
  for (const module of receipt.nativeScriptStorage.modules) {
    assert(!expectedScripts.has(module.name), `Duplicate expected module ${module.name}`);
    expectedScripts.set(module.name, module);
  }
  assert(expectedScripts.size > 0, 'Audio receipt has no module inventory');
}
const payload = container(gil);
const top = parse(payload, 20);
const {clientInterfaces, clientTemplates} = listInterface({mapPath: file});
assert.equal(clientInterfaces.length, 1);
const [{name: interfaceName}] = clientInterfaces;
const decodedUi = getClientUi({mapPath: file, ui: interfaceName});
assert.equal(decodedUi.sameNames, undefined);

function decodeIds(data = Buffer.alloc(0)) {
  const ids = [];
  let value = 0;
  let shift = 0;
  for (const byte of data) {
    assert(shift <= 49, 'Unsupported packed control ID');
    value += (byte & 127) * 2 ** shift;
    if (byte & 128) {
      shift += 7;
      continue;
    }
    assert(Number.isSafeInteger(value) && value > 0);
    ids.push(value);
    value = 0;
    shift = 0;
  }
  assert.equal(shift, 0, 'Truncated packed control ID');
  return ids;
}

const records = new Map();
const ui = top.find(row => row.id === 9 && row.wire === 2);
const uiFields = parse(ui.data, ui.dataStart);
for (const row of uiFields.filter(row => row.id === 502 && row.wire === 2)) {
  const id = Number(one(row.data, 501, 0));
  assert(!records.has(id), `Repeated physical UI record ${id}`);
  records.set(id, row);
}
const uiIds = new Map();
const groups = {nativeUi: {}, templates: {}};
function identify(id, category, detail, group, hidden) {
  assert(records.has(id) && !uiIds.has(id), `Missing or duplicate tree record ${id} ${detail}`);
  uiIds.set(id, {category, detail, group, hidden});
}
function visit(id, category, parts, groupName, ancestorHidden) {
  const data = records.get(id).data;
  const name = text(one(sameType(data, 505, 15), 12), 501);
  assert.equal(name, parts.at(-1));
  const type = sameType(data, 505, 86);
  const markedHidden = numeric(child(child(child(type, 503), 14), 17), 503) !== undefined;
  const hidden = ancestorHidden || markedHidden;
  const group = groups[category][groupName] ??= {group: groupName, controls: 0, hiddenBySelfOrAncestor: 0, images: 0, wireBytes: 0, hiddenWireBytes: 0};
  const detail = parts.join('/');
  identify(id, category, detail, group, hidden);
  if (category === 'nativeUi') assert.equal(decodedUi.ids[detail], id);
  group.controls++;
  group.hiddenBySelfOrAncestor += Number(hidden);
  group.images += Number(Boolean(sameType(data, 505, 96)));
  for (const childId of decodeIds(child(data, 503))) {
    const childName = text(one(sameType(records.get(childId).data, 505, 15), 12), 501);
    visit(childId, category, [...parts, childName], category === 'nativeUi' && detail === 'stage' ? childName : groupName, hidden);
  }
}
identify(decodedUi.containerId, 'nativeUi', `${interfaceName} interface`);
identify(decodedUi.rootId, 'nativeUi', `${interfaceName} root`);
for (const node of decodedUi.interface.controls) {
  visit(decodedUi.ids[node.name], 'nativeUi', [node.name], node.name, Boolean(decodedUi.interface.hidden));
}
assert.equal(Object.keys(decodedUi.ids).length, uiIds.size);
for (const {name, templateIndex} of clientTemplates) {
  visit(templateIndex, 'templates', [name], name, false);
}

const spans = [];
function span(start, end, category, detail, section) {
  assert(end >= start);
  if (end === start) return;
  assert.equal(start, spans.at(-1)?.end ?? 0, `Gap or overlap at ${detail}`);
  spans.push({start, end, bytes: end - start, category, detail, section});
}
const whole = (row, category, detail, section) => span(row.start, row.end, category, detail, section);
const prefix = (row, category, detail, section) => span(row.start, row.dataStart, category, detail, section);
const scriptRows = [];
let verifiedPackedModules = 0;
const otherUiRecords = [];
const graphRows = [];
const bgmConfig = [];
let foundBuildMarker = false;
span(0, 20, 'other', 'GIL header', 'container');
for (const row of top) {
  if (row.id === 9) {
    prefix(row, 'other', 'UI section framing', 9);
    for (const field of uiFields) {
      if (field.id === 502 && field.wire === 2) {
        const id = Number(one(field.data, 501, 0));
        const entry = uiIds.get(id);
        whole(field, entry?.category ?? 'other', entry?.detail ?? `Editor UI record ${id}`, 9);
        if (entry?.group) {
          entry.group.wireBytes += field.raw.length;
          if (entry.hidden) entry.group.hiddenWireBytes += field.raw.length;
        }
        if (!entry) {
          const named = sameType(field.data, 505, 15);
          otherUiRecords.push({id, name: named ? text(one(named, 12), 501) : '', bytes: field.raw.length});
        }
      } else {
        whole(field, 'other', `UI section metadata field ${field.id}`, 9);
      }
    }
  } else if (row.id === 10 && row.wire === 2) {
    prefix(row, 'other', 'Graph section framing', 10);
    for (const group of parse(row.data, row.dataStart)) {
      if (group.id !== 1 || group.wire !== 2) {
        whole(group, 'other', `Graph section field ${group.id}`, 10);
        continue;
      }
      prefix(group, 'other', 'Graph group framing', 10);
      for (const graph of parse(group.data, group.dataStart)) {
        const name = graph.id === 1 && graph.wire === 2 ? child(graph.data, 2)?.toString('utf8') : undefined;
        whole(graph, name === bgmName ? 'audio' : 'other', name || 'Graph group metadata', 10);
        if (name) graphRows.push({name, bytes: graph.raw.length});
      }
    }
  } else if (row.id === 50 && row.wire === 2) {
    prefix(row, 'lua', 'Lua section framing', 50);
    for (const record of parse(row.data, row.dataStart)) {
      if (record.id !== 1 || record.wire !== 2) {
        whole(record, 'lua', `Lua section field ${record.id}`, 50);
        continue;
      }
      const name = text(record.data, 2);
      const packed = one(record.data, 5);
      prefix(record, 'lua', `${name} record framing`, 50);
      for (const field of parse(record.data, record.dataStart)) {
        if (field.id === 5 && field.wire === 2) {
          const category = artNames.has(name) ? 'art' : name === 'abyss_bgm' ? 'audio' : 'lua';
          prefix(field, 'lua', `${name} source framing`, 50);
          span(field.dataStart, field.end, category, name, 50);
          const digest = sha(packed);
          if (isLocalCandidate) {
            const expected = expectedScripts.get(name);
            assert(expected, `Script is missing from the audio receipt: ${name}`);
            assert.equal(packed.length, expected.packedBytes, name);
            assert.equal(digest, expected.packedSha256, name);
            expectedScripts.delete(name);
            verifiedPackedModules++;
          }
          scriptRows.push({name, category, bytes: packed.length, sha256: digest});
          if (name === 'abyss_ui') foundBuildMarker = packed.toString('utf8').startsWith(`print("ABYSS_BUILD ${receipt.buildId}")\n`);
        } else {
          whole(field, 'lua', `${name} metadata field ${field.id}`, 50);
          if (name === 'abyss_ui' && [7, 8].includes(field.id) && field.wire === 2
              && text(field.data, 2) === 'nativeBgmEnabled') {
            assert.equal(numeric(one(one(field.data, 4), 106), 1), 1n, 'Native BGM disabled');
            bgmConfig.push(field.id);
          }
        }
      }
    }
  } else {
    whole(row, 'other', `Top-level field ${row.id}`, row.id);
  }
}
span(gil.length - 4, gil.length, 'other', 'GIL footer', 'container');
assert.equal(spans.at(-1).end, gil.length);
assert.equal(sum(spans, row => row.bytes), gil.length);
assert(foundBuildMarker);
assert.equal(expectedScripts.size, 0, 'Some receipt scripts were missing from GIL readback');
assert.equal(new Set(scriptRows.map(row => row.name)).size, scriptRows.length);
assert.equal(graphRows.filter(row => row.name === bgmName).length, 1);
assert.deepEqual(bgmConfig, [7, 8]);
const stats = inspectFile(file);
const bgm = stats.graphs.filter(graph => graph.name === bgmName && graph.type === 20000);
assert.equal(bgm.length, 1);
const audioSignals = [...new Set(bgm[0].signalReferences.map(row => row.name).filter(name => name.startsWith('ABYSS_BGM_')))].sort();
assert.deepEqual(audioSignals, ['BATTLE', 'BOSS', 'DEFEAT', 'ELITE', 'MAP', 'STOP', 'VICTORY'].map(cue => `ABYSS_BGM_${cue}`));
const sections = top.map(row => ({field: row.id, start: row.start, end: row.end, bytes: row.raw.length, sha256: sha(row.raw)}));
const bytesByCategory = Object.fromEntries(names.map(name => [name, sum(spans.filter(row => row.category === name), row => row.bytes)]));
assert.equal(sum(Object.values(bytesByCategory), bytes => bytes), gil.length);
const percentByCategory = Object.fromEntries(names.map(name => [name, +(100 * bytesByCategory[name] / gil.length).toFixed(5)]));
const layoutGroups = Object.values(groups.nativeUi);
const templateGroups = Object.values(groups.templates);
const uiSection = sections.find(row => row.field === 9);
const fixture = comparison && readJson(comparison).files.at(-1);
const publicFixtureComparison = fixture ? {
  sha256: fixture.identity.candidateSha256,
  gilBytes: fixture.gilBytes,
  uiSectionSha256: fixture.sections.find(row => row.field === 9).sha256,
  samePhysicalUiSection: uiSection.sha256 === fixture.sections.find(row => row.field === 9).sha256,
  sameLayoutGroups: isDeepStrictEqual(layoutGroups, fixture.ui.layoutGroups),
  sameTemplateGroups: isDeepStrictEqual(templateGroups, fixture.ui.templateGroups),
} : null;
const {loadTier, aggroMode} = getLevelSettings({mapPath: file});
const identity = isLocalCandidate ? {
  kind: 'local-audio-candidate', filename: basename(file), bytes: fileIdentity.bytes, sha256: fileIdentity.sha256,
  sourceCommit: receipt.sourceCommit, sourceDirty: receipt.sourceDirty, buildId: receipt.buildId, payloadDigest: receipt.payloadDigest,
  receiptSha256: sha(receiptBytes), sourceReceiptSha256: receipt.sourceReceipt.sha256, inputBase,
  nativeScriptStorage: receipt.nativeScriptStorage.profile,
  officialAssetsProfile: receipt.officialAssetsProfile, uiProfile: receipt.uiProfile,
} : {kind: 'published-archive', ...receipt, receiptSha256: sha(receiptBytes)};
const summary = {
  identity,
  gilBytes: gil.length,
  bytesByCategory,
  percentByCategory,
  checks: {matchedReceiptBytes: true, matchedReceiptSha256: true, embeddedBuildId: foundBuildMarker,
    verifiedPackedModules: isLocalCandidate ? verifiedPackedModules : null,
    gaplessNonOverlappingByteRanges: spans.length},
  publicFixtureComparison,
  ui: {section: uiSection, layoutControls: sum(layoutGroups, group => group.controls),
    initiallyHiddenLayoutControls: sum(layoutGroups, group => group.hiddenBySelfOrAncestor),
    initiallyHiddenLayoutBytes: sum(layoutGroups, group => group.hiddenWireBytes),
    templateDefinitions: templateGroups.length, templateControls: sum(templateGroups, group => group.controls),
    embeddedUiRecords: records.size, attributedUiRecords: uiIds.size, layoutGroups, templateGroups, otherUiRecords},
  scriptCount: scriptRows.length,
  packedLuaSourceBytes: sum(scriptRows, row => row.bytes),
  arts: scriptRows.filter(row => row.category === 'art'),
  largestOrdinaryLua: scriptRows.filter(row => row.category === 'lua').sort((a, b) => b.bytes - a.bytes).slice(0, 20),
  audio: {graph: graphRows.find(row => row.name === bgmName), lua: scriptRows.find(row => row.name === 'abyss_bgm'),
    graphNodes: bgm[0].nodeCount, signals: audioSignals, enabledMetadataFields: bgmConfig},
  graphRows,
  embeddedLevelSettings: {loadTier, aggroMode},
  sections,
};
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
const csv = (heads, rows) => [heads, ...rows].map(row => row.map(quote).join(',')).join('\n') + '\n';
mkdirSync(output);
const prefixName = isLocalCandidate ? 'candidate-capacity' : 'production-capacity';
writeFileSync(join(output, `${prefixName}.json`), JSON.stringify(summary, null, 2) + '\n');
writeFileSync(join(output, `${prefixName}.csv`), csv(['category', 'bytes', 'percentOfGil'],
  names.map(name => [name, bytesByCategory[name], percentByCategory[name]])));
console.log(JSON.stringify({gilBytes: gil.length, bytesByCategory, percentByCategory, checks: summary.checks, ui: {
  section: uiSection, layoutControls: summary.ui.layoutControls, initiallyHiddenLayoutControls: summary.ui.initiallyHiddenLayoutControls,
  initiallyHiddenLayoutBytes: summary.ui.initiallyHiddenLayoutBytes, templateDefinitions: summary.ui.templateDefinitions,
  templateControls: summary.ui.templateControls},
  scripts: summary.scriptCount, audio: summary.audio, embeddedLevelSettings: summary.embeddedLevelSettings}, null, 2));
