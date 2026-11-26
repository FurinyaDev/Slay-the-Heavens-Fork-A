import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { exactSourceMatches } from './source-fingerprint.mjs';

const archive = readFileSync(new URL('../fixtures/master-backflow-predecessors.json.gz', import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'), 'd5dd409d16ad3306d01998fe0fc3a993e90f4b7a2dc2d801cf3f45557e0bd920');
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
  assert(exactSourceMatches(text, after), message);
  const predecessor = crlf ? before.source.replaceAll('\n', '\r\n') : before.source;
  return buffered ? Buffer.from(predecessor) : predecessor;
}

export function beforeKnownMasterBackflowSource(path, source) {
  if (!Object.hasOwn(files, path) || !exactSourceMatches(source, files[path].after)) return source;
  return beforeMasterBackflowSource(path, source);
}

const replayReaders = new WeakSet();
export function readBeforeMasterBackflowSource(read) {
  if (replayReaders.has(read)) return read;
  const replay = (path, ...args) => beforeMasterBackflowSource(path, read(path, ...args));
  replayReaders.add(replay);
  return replay;
}
