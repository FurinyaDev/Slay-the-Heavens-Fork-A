import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { exactSourceMatches } from './source-fingerprint.mjs';

const archive = readFileSync(new URL('../fixtures/master-backflow-predecessors.json.gz', import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'), 'b16492b78553e53e675537d95d3f9ef24557d792f657ba41f0f280e43fab325f');
const { develop, master, ledgerPredecessor, files } = JSON.parse(gunzipSync(archive));
assert.equal(develop, 'e483c6a191dc8dd7622e0cb137e7b8581b171af8');
assert.equal(master, 'd96c9f0d7958148ec1bb027f14a3214da81d06b4');
// #1017 adds six reviewed reference origins before #1019 adopts the ledger.
assert.equal(ledgerPredecessor, '67baf53929708e20943c8644ea9234b89b0d0970');

for (const [path, { before, after }] of Object.entries(files)) {
  assert(exactSourceMatches(before.source, before), 'exact Develop predecessor: ' + path);
  assert.match(after.sha256, /^[a-f0-9]{64}$/);
  assert.match(after.gitBlob, /^[a-f0-9]{40}$/);
  assert.notEqual(before.sha256, after.sha256);
}

// #964 and #988 precede the backflow on develop. Bind the merged shop and
// ledger sources and the TASK-116 checkout cleanup alongside the frozen proof.
const updatedSources = new Map([
  ['.gitattributes', ['889f8fcde1d9cd6ec11ca79cec21677612e94b11cb1bfccd53a64fd5a71c06a6', 'dafbf156e289707fd0a9a612badf45794e6d67ba']],
  ['config/ci-media-lfs.json', ['2c8470c78d11cddfa0a33c234f624175636fa5f42fa2a9a558eb92425507ce00', '8e97088d1172eaa434a9f032166ca09325900983']],
  ['docs/legal/assets.json', ['2fd4b435b871db820568656d28d6afb7e755bc08bcc1afd870a53d8dbba57737', '8d2d572f49b288faa19abb5fb516f7f6b00f140f']],
  ['scripts/ci-media-lfs.mjs', ['e0e71dca9c631734d1cf52f9eae7684428095d949eb4b956d592899652ef0d63', '3803eaa2637dc1e8370bf98dba77e82cd52c71d9']],
  ['src/lua/abyss_shop_ui.lua', ['caa2a9e292c671e8caccda3c04905bad9f930b53bb5c52d14491452845b7cb1c', 'e7956c45a252b2595fb5af636b56e3a12d4a4581']],
  ['tests/ci-reviewed-lfs.test.mjs', ['2a9a520742fc514b7edfad5ae8b636caf5834cfd8e7c8cd49b971ea054a9c119', '0d61e4d967a2a9946cd2adb9d32762064215a73c']],
  ['tests/helpers/fork-preflight-source.mjs', ['50ac27e419d0ed510ccbb077128c98726ee176045c5699bd29fade30d4e7762d', '1a61e0b04c06f7b5e927ce6d83d6632e253b2db7']],
]);

function matchesSuccessor(path, source, original) {
  if (exactSourceMatches(source, original)) return true;
  const updated = updatedSources.get(path);
  return updated !== undefined && exactSourceMatches(source, { sha256: updated[0], gitBlob: updated[1] });
}

export function beforeMasterBackflowSource(path, source) {
  if (!Object.hasOwn(files, path)) return source;
  const { before, after } = files[path];
  const buffered = Buffer.isBuffer(source);
  const text = buffered ? source.toString('utf8') : source;
  const message = 'fresh master backflow source: ' + path;
  assert(typeof text === 'string' && (!buffered || Buffer.from(text).equals(source)), message);
  const normalized = text.replaceAll('\r\n', '\n');
  const crlf = normalized !== text;
  assert(!crlf || normalized.replaceAll('\n', '\r\n') === text, message);
  assert(matchesSuccessor(path, text, after), message);
  const predecessor = crlf ? before.source.replaceAll('\n', '\r\n') : before.source;
  return buffered ? Buffer.from(predecessor) : predecessor;
}

export function beforeKnownMasterBackflowSource(path, source) {
  if (!Object.hasOwn(files, path) || !matchesSuccessor(path, source, files[path].after)) return source;
  return beforeMasterBackflowSource(path, source);
}

const replayReaders = new WeakSet();
export function readBeforeMasterBackflowSource(read) {
  if (replayReaders.has(read)) return read;
  const replay = (path, ...args) => beforeMasterBackflowSource(path, read(path, ...args));
  replayReaders.add(replay);
  return replay;
}
