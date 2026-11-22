// Compare two complete audio builds using their measured wire sections and
// the logical inputs identified by each build's native production manifest.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sha256} from './evidence-files.mjs';

function verified(record){
 const bytes=readFileSync(record.path);
 assert.equal(bytes.length,record.bytes,`Size differs for ${record.path}`);
 assert.equal(sha256(bytes),record.sha256,`SHA-256 differs for ${record.path}`);
 return bytes;
}
function nodes(control){
 return (control.kind?1:0)+(control.children??control.controls??[]).reduce((sum,node)=>sum+nodes(node),0);
}
function measure(path,wire){
 const receipt=JSON.parse(readFileSync(path,'utf8'));
 const full=JSON.parse(verified(receipt.sourceReceipt));
 for(const name of ['buildId','sourceCommit','sourceDirty','payloadDigest','productionManifest','nativeScriptStorage','toolchainIdentity'])
  assert.deepEqual(receipt[name],full[name],`Audio and full receipt differ in ${name}`);
 assert.match(receipt.sourceCommit,/^[a-f0-9]{40}$/);
 assert.equal(receipt.sourceDirty,false);
 assert.equal(receipt.baseSha256,full.candidate.sha256);
 assert.equal(receipt.baseAfter,full.candidate.sha256);
 assert.equal(full.statuses.staticCheck,'pass');
 const base=verified(full.baseMap),gil=verified(receipt.candidate);
 const sections=wire.fields(wire.container(gil));
 const sectionBytes=id=>sections.filter(row=>row.id===id).reduce((sum,row)=>sum+row.raw.length,0);
 const layout=JSON.parse(verified(full.productionManifest.layout));
 const templates=JSON.parse(verified(full.productionManifest.templates));
 const {modules}=receipt.nativeScriptStorage;
 const configuration={baseSha256:sha256(base),baseBytes:base.length,release:receipt.release,artFeatures:receipt.artFeatures,
  officialAssetsProfile:receipt.officialAssetsProfile,uiProfile:receipt.uiProfile,
  mcpVersion:full.mcpVersion,encoderSha256:full.toolchainIdentity.sourceSha256};
 const metrics={gilBytes:gil.length,nativeUiBytes:sectionBytes(9),nativeScriptBytes:sectionBytes(50),serverGraphBytes:sectionBytes(10),
  layoutControls:nodes(layout),templateControls:templates.reduce((sum,node)=>sum+nodes(node),0),
  layoutJsonBytes:Buffer.byteLength(JSON.stringify(layout)),templateJsonBytes:Buffer.byteLength(JSON.stringify(templates)),
  packedLuaBytes:modules.reduce((sum,module)=>sum+module.packedBytes,0),modules:modules.length};
 return {configuration,sourceCommit:receipt.sourceCommit,buildId:receipt.buildId,candidateSha256:receipt.candidate.sha256,
  payloadDigest:receipt.payloadDigest,storageProfile:receipt.nativeScriptStorage.profile,metrics,modules};
}

const [beforePath,afterPath,...extra]=process.argv.slice(2);
if(!beforePath||!afterPath||extra.length||!process.env.MILIASTRA_MCP_ROOT)
 throw Error('Usage: MILIASTRA_MCP_ROOT=/path/to/toolchain node scripts/compare-native-resource-builds.mjs before/candidate.json after/candidate.json');
const wirePath=join(resolve(process.env.MILIASTRA_MCP_ROOT),'src/scene/wire.mjs');
const wire=await import(pathToFileURL(wirePath));
const before=measure(beforePath,wire),after=measure(afterPath,wire);
assert.deepEqual(after.configuration,before.configuration,'Compare complete builds with the same base, profile, release notes, and encoder');
const prior=new Map(before.modules.map(row=>[row.name,row]));
assert.deepEqual(after.modules.map(row=>row.name).sort(),[...prior.keys()].sort(),'Production Lua module sets differ');
const moduleChanges=after.modules.flatMap(({name,packedBytes})=>{
 const from=prior.get(name).packedBytes;
 return from===packedBytes?[]:[{name,before:from,after:packedBytes,delta:packedBytes-from}];
});
const delta=Object.fromEntries(Object.keys(before.metrics).map(key=>[key,after.metrics[key]-before.metrics[key]]));
delete before.modules;
delete after.modules;
console.log(JSON.stringify({before,after,delta,moduleChanges,officialMetrics:'UNVERIFIED'},null,2));
