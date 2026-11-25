import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';

const [toolRoot, output, ...inputs] = process.argv.slice(2);
if (!toolRoot || !output || !inputs.length || inputs.some(arg => !arg.includes('='))) {
  throw Error('Usage: node measure-native-capacity.mjs <MCP root> <out dir> <label=audio/candidate.json> [...]');
}
const importTool = path => import(pathToFileURL(resolve(toolRoot, path)));
const {container, fields, one} = await importTool('src/scene/wire.mjs');
const {getClientUi, listInterface, getLevelSettings} = await importTool('src/scene-save.mjs');
const {inspectFile} = await importTool('src/adapter.mjs');
const sha = b => createHash('sha256').update(b).digest('hex');
const sum = (items, fn) => items.reduce((total, item) => total + fn(item), 0);
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const method = 'Same public native comparison fixture; physically measured GIL; production source recipe; official deployment and capacity unverified';
const approvedFixtureSha = 'b3b46b0412caf865ebc259c15ad8215b33a1797ab7940861eb562320541e13a2';
const artModules = new Set(['abyss_monster_art_data', 'abyss_traveler_portrait_assets']);
const bgmName = '_GSTS_ABYSS_BGM';
const labels = {
  nativeUi: 'Native UI layout', templates: 'Client UI templates', lua: 'Lua and record framing',
  art: 'Art geometry encoded in Lua', audio: 'BGM graph and Lua bridge', other: 'Other sections and container',
};
const colors = {nativeUi:'#116865', templates:'#25578c', lua:'#4c4b83', art:'#8b542b', audio:'#954269', other:'#536573'};

function verified(row, roots) {
  const paths = row.absolutePath ? [row.absolutePath] : [];
  paths.push(row.path, ...roots.map(root => resolve(root, row.path)));
  for (const path of new Set(paths)) {
    try {
      const bytes = readFileSync(path);
      assert.equal(bytes.length, row.bytes, path);
      assert.equal(sha(bytes), row.sha256, path);
      return {path: resolve(path), bytes};
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  throw Error(`Receipt path unavailable: ${row.path}`);
}

function locate(message, start) {
  return fields(message).map(field => {
    const rawStart = start;
    start += field.raw.length;
    return {...field, start: rawStart, end: start, dataStart: start - (field.data?.length ?? 0)};
  });
}

function unpackIds(bytes) {
  const ids = [];
  let current = 0, shift = 0;
  for (const byte of bytes) {
    assert(shift <= 49, 'Invalid packed UI id');
    current += (byte & 127) * 2 ** shift;
    if (byte & 128) {
      shift += 7;
    } else {
      assert(Number.isSafeInteger(current) && current > 0, 'Invalid UI id');
      ids.push(current);
      current = 0;
      shift = 0;
    }
  }
  assert.equal(shift, 0, 'Truncated packed UI id');
  return ids;
}

function templatePaths(root, tree, packedRecords) {
  const paths = {};
  function visit(id, node, trail) {
    const parts = fields(packedRecords.get(id));
    const content = parts.filter(row => row.id === 505 && row.wire === 2);
    const named = content.find(row => one(row.data, 502, 0) === 15n);
    assert.equal(one(one(named.data, 12), 501).toString('utf8'), node.name, `Readback UI record ${id} name differs`);
    paths[trail.join('/')] = id;
    const childBytes = parts.find(row => row.id === 503 && row.wire === 2)?.data;
    const children = childBytes ? unpackIds(childBytes) : [];
    assert.equal(children.length, node.children?.length ?? 0, `Readback UI record ${id} child count differs`);
    children.forEach((child, index) => visit(child, node.children[index], [...trail, node.children[index].name]));
  }
  visit(root, tree, [tree.name]);
  return paths;
}

function idPaths(mapPath, layout, templates, templateInventory, wireUi) {
  const ids = new Map();
  const add = (id, category, detail, group, hidden = false) => {
    assert(Number.isSafeInteger(id) && !ids.has(id), `Duplicate or missing UI record ${id}: ${detail}`);
    ids.set(id, {category, detail, group, hidden});
  };
  const walk = (node, parts, hidden, decodedIds, category, groups, group) => {
    const hiddenNow = hidden || node.visible === false;
    const path = parts.join('/');
    const row = groups[group] ??= {controls: 0, hiddenBySelfOrAncestor: 0, images: 0, wireBytes: 0, hiddenWireBytes: 0, group};
    add(decodedIds[path], category, path, row, hiddenNow);
    row.controls++;
    row.hiddenBySelfOrAncestor += Number(hiddenNow);
    row.images += Number(node.kind === 'image');
    for (const child of node.children ?? []) {
      const childGroup = path === 'stage' && category === 'nativeUi' ? child.name : group;
      walk(child, [...parts, child.name], hiddenNow, decodedIds, category, groups, childGroup);
    }
  };
  const layoutGroups = {}, templateGroups = {};
  const rendered = getClientUi({mapPath, ui: layout.name});
  add(rendered.containerId, 'nativeUi', `${layout.name} interface`);
  add(rendered.rootId, 'nativeUi', `${layout.name} root`);
  for (const node of layout.controls) {
    walk(node, [node.name], layout.hidden === true, rendered.ids, 'nativeUi', layoutGroups, node.name);
  }
  const packedRecords = new Map(wireUi.filter(row => row.id === 502 && row.wire === 2)
    .map(row => [Number(one(row.data, 501, 0)), row.data]));
  for (const tree of templates) {
    const templateId = templateInventory.get(tree.name);
    assert(templateId, `Template missing: ${tree.name}`);
    walk(tree, [tree.name], false, templatePaths(templateId, tree, packedRecords), 'templates', templateGroups, tree.name);
  }
  return {ids, layoutGroups: Object.values(layoutGroups), templateGroups: Object.values(templateGroups)};
}

function measure(label, receiptPath) {
  const audio = json(receiptPath);
  const roots = [dirname(resolve(receiptPath))];
  const final = verified(audio.candidate, roots);
  const fullFile = verified(audio.sourceReceipt, roots);
  const full = JSON.parse(fullFile.bytes);
  roots.unshift(dirname(fullFile.path));
  for (const key of ['sourceCommit', 'buildId', 'payloadDigest', 'nativeScriptStorage']) {
    assert.deepEqual(audio[key], full[key], key);
  }
  assert.equal(audio.baseSha256, full.candidate.sha256);
  assert.equal(audio.sourceDirty, false);
  assert.equal(full.statuses.staticCheck, 'pass');
  assert.equal(full.baseMap.sha256, approvedFixtureSha);
  const ui = JSON.parse(verified(full.productionManifest.layout, roots).bytes);
  const templates = JSON.parse(verified(full.productionManifest.templates, roots).bytes);
  const interfaceInventory = listInterface({mapPath: final.path});
  const templateByName = new Map(interfaceInventory.clientTemplates.map(row => [row.name, row.templateIndex]));
  assert.equal(templateByName.size, interfaceInventory.clientTemplates.length, 'Duplicate template name');
  assert(full.deckBrowser?.templateIndex > 0, 'Deck browser missing from full native receipt');
  assert.equal(templateByName.get('AbyssBattlePileCard'), full.deckBrowser.templateIndex, 'Deck browser index drift');
  for (const part of full.deckBrowser.parts) assert.equal(templateByName.get(part.name), part.templateIndex, part.name);
  const payload = container(final.bytes);
  const {ids, layoutGroups, templateGroups} = idPaths(final.path, ui, templates, templateByName, fields(one(payload, 9)));
  const inventory = inspectFile(final.path);
  const {loadTier, aggroMode} = getLevelSettings({mapPath: final.path});
  const bgm = inventory.graphs.filter(graph => graph.name === bgmName && graph.type === 20000);
  assert.equal(bgm.length, 1, 'Expected one native BGM graph');
  assert(bgm[0].nodeCount > 0, 'Empty native BGM graph');
  const bgmSignals = [...new Set(bgm[0].signalReferences.map(row => row.name).filter(name => name.startsWith('ABYSS_BGM_')))].sort();
  assert.deepEqual(bgmSignals, ['BATTLE','BOSS','DEFEAT','ELITE','MAP','STOP','VICTORY'].map(cue => `ABYSS_BGM_${cue}`));
  const storage = new Map(audio.nativeScriptStorage.modules.map(row => [row.name, row]));
  assert.equal(storage.size, audio.nativeScriptStorage.modules.length, 'Duplicate receipt scripts');
  const moduleRows = [], spans = [], sections = [], measuredUiIds = new Set(), bgmEnableFields = [];
  const span = (start, end, category, detail, section) => {
    assert(end >= start, detail);
    if (end > start) spans.push({start, end, bytes: end - start, category, detail, section});
  };
  const whole = (field, category, detail, section) => span(field.start, field.end, category, detail, section);
  const prefix = (field, category, detail, section) => span(field.start, field.dataStart, category, detail, section);
  span(0, 20, 'other', 'GIL header', 'container');
  for (const top of locate(payload, 20)) {
    sections.push({field: top.id, wire: top.wire, bytes: top.raw.length, start: top.start, end: top.end, sha256: sha(top.raw)});
    if (![9, 10, 50].includes(top.id) || top.wire !== 2) {
      whole(top, 'other', `Section ${top.id}`, top.id);
      continue;
    }
    const category = top.id === 9 ? 'other' : top.id === 50 ? 'lua' : 'other';
    prefix(top, category, `Section ${top.id} framing`, top.id);
    for (const field of locate(top.data, top.dataStart)) {
      if (top.id === 9 && field.id === 502 && field.wire === 2) {
        const id = Number(one(field.data, 501, 0));
        const row = ids.get(id);
        assert(!measuredUiIds.has(id), `Repeated physical UI record ${id}`);
        measuredUiIds.add(id);
        whole(field, row?.category ?? 'other', row?.detail ?? `Unassigned editor UI record ${id}`, 9);
        if (row?.group) {
          row.group.wireBytes += field.raw.length;
          if (row.hidden) row.group.hiddenWireBytes += field.raw.length;
        }
        continue;
      }
      if (top.id === 50 && field.id === 1 && field.wire === 2) {
        const name = one(field.data, 2).toString('utf8');
        const expected = storage.get(name);
        assert(expected, `Receipt misses script ${name}`);
        storage.delete(name);
        prefix(field, 'lua', `${name} record framing`, 50);
        for (const leaf of locate(field.data, field.dataStart)) {
          if (leaf.id === 5 && leaf.wire === 2) {
            const kind = artModules.has(name) ? 'art' : name === 'abyss_bgm' ? 'audio' : 'lua';
            assert.equal(leaf.data.length, expected.packedBytes, name);
            assert.equal(sha(leaf.data), expected.packedSha256, name);
            prefix(leaf, 'lua', `${name} source framing`, 50);
            span(leaf.dataStart, leaf.end, kind, name, 50);
            moduleRows.push({name, category: kind, sourceBytes: expected.sourceBytes, packedBytes: expected.packedBytes, packedSha256: expected.packedSha256});
          } else {
            if (name === 'abyss_ui' && [7,8].includes(leaf.id) && leaf.wire === 2 &&
              one(leaf.data, 2).toString('utf8') === 'nativeBgmEnabled') {
              const enabled = fields(one(one(leaf.data, 4), 106)).some(row => row.id === 1 && row.wire === 0 && row.value === 1n);
              assert(enabled, 'Native BGM option disabled');
              bgmEnableFields.push(leaf.id);
            }
            whole(leaf, 'lua', `${name} metadata field ${leaf.id}`, 50);
          }
        }
        continue;
      }
      if (top.id === 10 && field.id === 1 && field.wire === 2) {
        prefix(field, 'other', 'Node graph group framing', 10);
        for (const graph of locate(field.data, field.dataStart)) {
          const name = graph.id === 1 && graph.wire === 2
            ? fields(graph.data).find(item => item.id === 2 && item.wire === 2)?.data.toString('utf8') : undefined;
          whole(graph, name === bgmName ? 'audio' : 'other', name || 'Node graph group metadata', 10);
        }
        continue;
      }
      whole(field, category, `Section ${top.id} field ${field.id}`, top.id);
    }
  }
  span(final.bytes.length - 4, final.bytes.length, 'other', 'GIL footer', 'container');
  for (const id of ids.keys()) assert(measuredUiIds.has(id), `Mapped UI record missing in wire: ${id}`);
  assert.equal(storage.size, 0, 'Unverified receipt scripts');
  assert.equal(moduleRows.length, audio.nativeScriptStorage.modules.length, 'Source payload count differs');
  assert.deepEqual(bgmEnableFields, [7,8], 'Native BGM enable records differ');
  assert.equal(spans.filter(s => s.detail === bgmName).length, 1, 'BGM span ambiguous');
  for (let i = 1; i < spans.length; i++) assert.equal(spans[i].start, spans[i - 1].end, 'Uncounted or overlapping bytes');
  assert.equal(sum(spans, row => row.bytes), final.bytes.length);
  const bytesByCategory = Object.fromEntries(Object.keys(labels).map(key => [key, sum(spans.filter(row => row.category === key), row => row.bytes)]));
  const {sourcePath, helperPath, ...toolchain} = audio.toolchainIdentity;
  return {identity: {label, sourceCommit: audio.sourceCommit, buildId: audio.buildId, candidateSha256: audio.candidate.sha256,
    payloadDigest: audio.payloadDigest, baseSha256: full.baseMap.sha256, toolchain,
    release: audio.release, nativeScriptStorage: audio.nativeScriptStorage.profile, artFeatures: audio.artFeatures,
    officialAssetsProfile: audio.officialAssetsProfile, uiProfile: audio.uiProfile}, gilBytes: final.bytes.length,
    fullScriptReadback: moduleRows.length, bytesByCategory, sections, ui: {layoutGroups, templateGroups,
      layoutControls: sum(layoutGroups, row => row.controls), layoutHidden: sum(layoutGroups, row => row.hiddenBySelfOrAncestor),
      templateControls: sum(templateGroups, row => row.controls), templateHiddenFlags: sum(templateGroups, row => row.hiddenBySelfOrAncestor),
      embeddedUiRecords: measuredUiIds.size, mappedUiRecords: ids.size,
      layoutJsonBytes: Buffer.byteLength(JSON.stringify(ui)), templateJsonBytes: Buffer.byteLength(JSON.stringify(templates))},
    audio: {graphName: bgm[0].name, graphNodes: bgm[0].nodeCount, bgmSignals, bgmEnableFields,
      musicKind: 'Host track IDs and event graph. Listening and host media loading UNVERIFIED.'},
    deckBrowser: {verifiedTemplateIds: full.deckBrowser, finalReceiptRetainedDeckBrowser: Boolean(audio.deckBrowser)},
    offlineFixtureLevelSettings: {loadTier, aggroMode},
    monsterActors: full.monsterActors,
    nativeMonsterArt: full.nativeMonsterArt,
    officialPortraits: full.officialPortraits,
    moduleRows, spans};
}

const measurements = inputs.map(arg => {
  const [label, ...path] = arg.split('=');
  return measure(label, path.join('='));
});
const svgEscape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function treemap(rows) {
  const width=1160, chartWidth=1080, chartHeight=100, scale=Math.max(...rows.map(row=>row.gilBytes));
  const order=['nativeUi','lua','templates','art','audio','other'];
  const items=rows.flatMap((row,index)=>{
    const x=38, y=86+index*178;
    const header=`<text x="${x}" y="${y}" font-size="18" font-weight="600">${svgEscape(row.identity.label)}  ·  ${row.identity.sourceCommit.slice(0,8)}  ·  ${row.gilBytes.toLocaleString('en-US')} B</text>`;
    let cursor=x;
    const rectangles=order.map(key=>{
      const bytes=row.bytesByCategory[key], w=chartWidth*bytes/scale;
      const title=`${labels[key]}: ${bytes.toLocaleString('en-US')} B (${(100*bytes/row.gilBytes).toFixed(2)}%)`;
      const tooltip=`<title>${svgEscape(title)}</title>`;
      const result=`<g>${tooltip}<rect x="${cursor.toFixed(4)}" y="${y+14}" width="${w.toFixed(4)}" height="${chartHeight}" fill="${colors[key]}"/>`+
        (w>106?`<text x="${(cursor+10).toFixed(4)}" y="${y+70}" fill="white" font-size="14">${svgEscape(key==='nativeUi'?'Native UI':key==='lua'?'Lua':labels[key])}</text>`:'')+'</g>';
      cursor+=w;
      return result;
    });
    const alt=order.map(key=>`${labels[key]} ${row.bytesByCategory[key].toLocaleString('en-US')}`).join('  ·  ');
    return [header,...rectangles,`<text x="${x}" y="${y+140}" font-size="13" fill="#304157">${svgEscape(alt)}</text>`];
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${85+rows.length*178}" viewBox="0 0 ${width} ${85+rows.length*178}" role="img" aria-labelledby="title desc"><title id="title">GIL capacity by physical byte range</title><desc id="desc">${svgEscape(method)}. Equal area shows equal bytes. Every overlapping resource belongs to one physical byte range.</desc><rect width="100%" height="100%" fill="#f7f9fc"/><g font-family="system-ui, sans-serif" fill="#17293b"><text x="38" y="32" font-size="23" font-weight="700">GIL capacity · same public base fixture</text><text x="38" y="53" font-size="13" fill="#405268">Physical file bytes · same area scale across versions · official storage and runtime memory remain unmeasured</text>${items.join('')}</g></svg>\n`;
}
const csv = (heads, rows) => [heads, ...rows].map(row => row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\n')+'\n';
mkdirSync(output, {recursive: true});
const summary = {method, files: measurements.map(({spans,...row})=>row)};
writeFileSync(join(output, 'capacity.json'), JSON.stringify(summary, null, 2)+'\n');
writeFileSync(join(output, 'capacity.csv'), csv(['build','sourceCommit','category','bytes','gilBytes'],
  measurements.flatMap(row => Object.entries(row.bytesByCategory).map(([key,bytes])=>[row.identity.label,row.identity.sourceCommit,key,bytes,row.gilBytes]))));
writeFileSync(join(output, 'capacity-spans.csv.gz'), gzipSync(csv(['build','startInclusive','endExclusive','bytes','category','detail','section'],
  measurements.flatMap(row=>row.spans.map(({start,end,bytes,category,detail,section})=>[row.identity.label,start,end,bytes,category,detail,section])))));
writeFileSync(join(output, 'capacity-treemap.svg'), treemap(measurements));
