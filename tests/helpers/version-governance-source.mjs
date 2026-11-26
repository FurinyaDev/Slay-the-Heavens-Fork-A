import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { restoreExactFixtureHunks } from './exact-fixture-hunks.mjs';

const content = readFileSync(new URL('../fixtures/version-governance-source.json', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
if (createHash('sha256').update(content).digest('hex') !== 'c6d23795c9ec173765a1f4146954f68b4a1bbe00778a2a60bbe1c8eaf91e5506') {
  throw new Error('Exact pre-governance tool evidence differs');
}
const proofs = JSON.parse(content);

export function beforeVersionGovernanceSource(path, source) {
  if (!Object.hasOwn(proofs, path) || typeof source !== 'string') return source;
  const normalized = source.replaceAll('\r\n', '\n');
  if (normalized.includes('\r')) return source;
  const crlf = source !== normalized && source === normalized.replaceAll('\n', '\r\n');
  if (source !== normalized && !crlf) return source;
  const before = restoreExactFixtureHunks(proofs[path], path, normalized);
  const preserveEnding = ['scripts/publish-pr-quality.mjs', 'tests/auto-merge.test.mjs'].includes(path);
  return crlf && preserveEnding ? before.replaceAll('\n', '\r\n') : before;
}
