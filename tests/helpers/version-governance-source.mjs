import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { restoreExactFixtureHunks } from './exact-fixture-hunks.mjs';

const content = readFileSync(new URL('../fixtures/version-governance-source.json', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
if (createHash('sha256').update(content).digest('hex') !== '61106a4abf5a75b8999db9fd388caa513aca09142f1181b36a7be2c281bb4fe9') {
  throw new Error('Exact pre-governance tool evidence differs');
}
const proofs = JSON.parse(content);

export function beforeVersionGovernanceSource(path, source) {
  return Object.hasOwn(proofs, path) ? restoreExactFixtureHunks(proofs[path], path, source) : source;
}
