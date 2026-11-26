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
  ['.gitattributes', ['0aba7195a1eef9b162ca4b6e34e305d999265b8a06442bfcfbe5daedb46340bb', 'c8c30698af877c6ca9775cd06db51f59b7835af8']],
  ['config/ci-media-lfs.json', ['f7e0299e0d8b5be14a94f7bbfdc6f90153b07485a7b4575e0f54f2c93956d88f', '754f9d4ff2af525e7f42981001ebb10ad043417d']],
  ['docs/legal/assets.json', ['4c75c58ba79f5cfb92e9cc9a076aba16e961a00f2140bdc70918a40fe100bc03', '459c11dcfaa1d2c9e564db8df36002aea78c8ed2']],
  ['scripts/ci-media-lfs.mjs', ['c6910f11876c2c542064acbd0a4a6a0cd34aa1fc5d65fd251f98eff90b6087e9', 'f6d203eeefd950d3a052548799ce3d11b49b91a9']],
  ['src/lua/abyss_shop_ui.lua', ['caa2a9e292c671e8caccda3c04905bad9f930b53bb5c52d14491452845b7cb1c', 'e7956c45a252b2595fb5af636b56e3a12d4a4581']],
  ['tests/ci-reviewed-lfs.test.mjs', ['279dd9ee1076cb17e4de084e8b2298848e8db02276b212241fa5cf18740fbff8', '1e18ae84225ae15bac2a84dd2efbd7a05a9990ea']],
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
