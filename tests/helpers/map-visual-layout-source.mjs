import {readFileSync} from 'node:fs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';

const bindings = JSON.parse(readFileSync(new URL('./map-visual-layout-source.json', import.meta.url)));

export function beforeMapVisualLayout(path, source) {
  if (!Object.hasOwn(bindings, path) || typeof source !== 'string') return source;
  const lf = source.replaceAll('\r\n', '\n');
  if (lf.includes('\r') || (source !== lf && source !== lf.replaceAll('\n', '\r\n'))) return source;
  const prior = restoreExactFixtureHunks(bindings[path], path, lf);
  return prior === lf ? source : source === lf ? prior : prior.replaceAll('\n', '\r\n');
}
