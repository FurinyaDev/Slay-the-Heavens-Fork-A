import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {copyIntegrationSourceClosure,potionPointerUnionHelperCopies} from '../../../../tests/helpers/copy-integration-source-closure.mjs';
import {sourceEpoch} from '../../../../tests/helpers/closeout-source-epoch.mjs';
const temp=mkdtempSync(join(tmpdir(),'union-copy-')),root=join(temp,'root');mkdirSync(root);let cases=0;
try{
 copyIntegrationSourceClosure(root);cases++;
 const copied=await import(pathToFileURL(join(root,'tests/helpers/closeout-source-epoch.mjs')));
 assert.deepEqual(copied.sourceEpoch.proof,sourceEpoch.proof);cases++;
 assert.equal(Object.keys(copied.sourceEpoch.proof.current).length,352);
 assert.equal(Object.keys(copied.sourceEpoch.proof.targets).length,75);
 const hash=b=>createHash('sha256').update(b).digest('hex');
 for(const row of potionPointerUnionHelperCopies){
  const path=join(root,row.path),bytes=readFileSync(path);assert.equal(hash(bytes),row.after);cases++;
  for(const mode of ['missing','empty','drift']){
   if(mode==='missing')rmSync(path);else writeFileSync(path,mode==='empty'?Buffer.alloc(0):Buffer.concat([bytes,Buffer.from('\n')]));
   const dest=mkdtempSync(join(temp,'reject-'));
   assert.throws(()=>copyIntegrationSourceClosure(dest,{sourceRoot:root}),undefined,`${mode}: ${row.path}`);cases++;
   writeFileSync(path,bytes);
  }
 }
 // A copied tree remains a valid distinct source root, including binary archives.
 const again=mkdtempSync(join(temp,'again-'));copyIntegrationSourceClosure(again,{sourceRoot:root});cases++;
 assert.deepEqual((await import(pathToFileURL(join(again,'tests/helpers/closeout-source-epoch.mjs')))).sourceEpoch.proof,sourceEpoch.proof);cases++;
 // Text LF identity is platform-neutral; gzip bytes remain unchanged.
 for(const row of potionPointerUnionHelperCopies.filter(x=>!x.path.endsWith('.gz'))){const path=join(root,row.path);writeFileSync(path,readFileSync(path,'utf8').replaceAll('\n','\r\n'));}
 copyIntegrationSourceClosure(mkdtempSync(join(temp,'crlf-')),{sourceRoot:root});cases++;
 assert.throws(()=>copyIntegrationSourceClosure(root,{sourceRoot:root}),/isolated helper copy destination/);cases++;
 const escaped=mkdtempSync(join(temp,'escape-')),outside=mkdtempSync(join(temp,'outside-'));mkdirSync(join(escaped,'tests'));symlinkSync(outside,join(escaped,'tests/helpers'));
 assert.throws(()=>copyIntegrationSourceClosure(escaped,{sourceRoot:root}),/helper destination parent escaped/);cases++;
 console.log(JSON.stringify({status:'PASS',cases,current:352,targets:75,unionDependencies:potionPointerUnionHelperCopies.length,scope:'isolated helper-copy closure only; CI union and official acceptance incomplete'}));
}finally{rmSync(temp,{recursive:true,force:true});}
