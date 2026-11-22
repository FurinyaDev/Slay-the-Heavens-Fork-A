// Historical UI replay uses the exact source before the shared action button change.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = source => source.replaceAll('\r\n', '\n');
const archive = readFileSync(new URL('../fixtures/action-buttons-source.json.gz', import.meta.url));
assert.equal(hash(archive), '29ccd320bc4e0f14a878435d306defeac7f1dd93341e7877eb7b388ec4eea635');
const { base, files } = JSON.parse(gunzipSync(archive));
assert.equal(base, '19d4be4d9af4bf42635a224a118fc99898ea7898');
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
