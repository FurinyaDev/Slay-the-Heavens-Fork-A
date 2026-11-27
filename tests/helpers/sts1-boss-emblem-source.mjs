import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { restoreExactFixtureHunks } from './exact-fixture-hunks.mjs';
import { exactSourceMatches } from './source-fingerprint.mjs';

const bindings = JSON.parse(readFileSync(new URL('./sts1-boss-emblem-source.json', import.meta.url)));

export function beforeBossEmblemSource(path, raw) {
  if (!Object.hasOwn(bindings, path)) return raw;
  const source = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
  const { current, previous, hunks } = bindings[path];
  if (!exactSourceMatches(source, current) || (Buffer.isBuffer(raw) && !Buffer.from(source).equals(raw))) return raw;
  const lf = source.replaceAll('\r\n', '\n');
  if (source !== lf && source !== lf.replaceAll('\n', '\r\n')) return raw;
  const restored = restoreExactFixtureHunks({ path, beforeSha256: previous.sha256, afterSha256: current.sha256, hunks }, path, lf);
  assert(exactSourceMatches(restored, previous), 'exact pre-emblem source: ' + path);
  const text = source === lf ? restored : restored.replaceAll('\n', '\r\n');
  return Buffer.isBuffer(raw) ? Buffer.from(text) : text;
}
