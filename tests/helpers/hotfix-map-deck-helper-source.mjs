import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const hash=source=>createHash('sha256').update(source).digest('hex');
const helperPath='tests/helpers/release-map-deck-source.mjs';
const hotfixHash='be99ed469b62b7f9c3e40a62124dfc51cd9aa17e6bb04852e88a9e9f9bee7a70';
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
