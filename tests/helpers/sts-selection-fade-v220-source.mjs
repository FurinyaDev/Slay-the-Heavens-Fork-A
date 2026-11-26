import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeMasterBackflowSource} from './master-backflow-source.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

const archive=readFileSync(new URL('../fixtures/sts-selection-fade-v220-owners.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'),
 'db78632198c1bc0cf1d31803f2727f24b64b17a3676224b2d8b612361c1cc067','exact selection fade continuation');
const {develop,entrance,files}=JSON.parse(gunzipSync(archive));
assert.equal(develop,'e483c6a191dc8dd7622e0cb137e7b8581b171af8');
assert.equal(entrance,'c420b02841c61d5270fd8588d072fc62ec9a5071');

// Authenticate the live owner and its Develop predecessor before handing the
// frozen entrance cohort back to the original historical replay.
export function beforeV220SelectionFadeSource(path,source){
 const previous=beforeMasterBackflowSource(path,source);
 if(!Object.hasOwn(files,path))return previous;
 const row=files[path];
 assert(exactSourceMatches(previous,row.develop),'fresh linked STS fade source: '+path);
 assert(exactSourceMatches(row.entrance.source,row.entrance),'exact entrance predecessor: '+path);
 return previous.includes('\r\n')?row.entrance.source.replaceAll('\n','\r\n'):row.entrance.source;
}
