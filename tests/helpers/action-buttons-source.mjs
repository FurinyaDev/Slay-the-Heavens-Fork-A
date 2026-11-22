// Historical UI replay uses the exact source before the shared action button change.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = source => source.replaceAll('\r\n', '\n');
const archive = readFileSync(new URL('../fixtures/action-buttons-source.json.gz', import.meta.url));
assert.equal(hash(archive), '1e9fb9a9d7ff0ead307c6a4a992da20190462befd2e566191992ced1485a2f3a');
const { base, files } = JSON.parse(gunzipSync(archive));
assert.equal(base, 'd7ae494a3136b2f4f707428fefeeae478c6e0495');
for (const row of Object.values(files)) assert.equal(hash(row.before), row.beforeSha);

export const actionButtonsOwns = path => Object.hasOwn(files, path);

function matches(path, source) {
  return actionButtonsOwns(path) && typeof source === 'string' && !source.includes('\r\r\n')
    && hash(normalize(source)) === files[path].afterSha;
}

export function beforeActionButtons(path, source) {
  if (!matches(path, source)) return source;
  const prior = files[path].before;
  return source.includes('\r\n') ? prior.replaceAll('\n', '\r\n') : prior;
}

export function authenticateActionButtons(path, source, read) {
  const prior = beforeActionButtons(path, source);
  if (prior !== source) {
    assert(matches(path, read(path)), 'combined linked owner identity: ' + path + ' changed during action button validation');
  }
  return prior;
}
