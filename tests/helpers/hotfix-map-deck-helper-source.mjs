import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const hash=source=>createHash('sha256').update(source).digest('hex');
const helperPath='tests/helpers/release-map-deck-source.mjs';
const hotfixHash='dd43cfb80c2abafca5ce06db1cd6e3b49c367dca8f57056837ae063c0568164c';
const archivedHash='d76d9d67c6e696d966fe9608a46e66eea0c0e2739c06dd9672151afd4b1f0973';

// Historical helper copies need the exact original module and its original imports.
export function beforeHotfixMapDeckHelperSource(path,source){
  if(path!==helperPath)return source;
  const current=source.replaceAll('\r\n','\n');
  if(hash(current)!==hotfixHash)return source;
  const prior=current
    .replace("import {beforeHotfixMapDeckHelperSource} from './hotfix-map-deck-helper-source.mjs';\n",'')
    .replace(/\/\/ Continue the archived map-deck replay[^]*?(?=const forethoughtSources=)/,'')
    .replace(/  const helper=beforeHotfixMapDeckHelperSource[^]*?(?=  const closeout=beforeReleaseUiCloseoutSource)/,'');
  assert.equal(hash(prior),archivedHash,'exact archived map deck helper source');
  return source.includes('\r\n')?prior.replaceAll('\n','\r\n'):prior;
}
