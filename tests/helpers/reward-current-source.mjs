import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exactSourceMatches,sourceConfigLayoutMatches} from './source-fingerprint.mjs';
import {readRetiredController,retiredControllerPath} from './input-retirement-source.mjs';
import {releaseUiRestoreArchive} from './release-ui-restore-source.mjs';

// These three reward owners kept their source bytes after #934. The linked
// closure below still needs exact current owners before it can use that view.
const config='config/architecture.json';
const rewardHosts=Object.freeze({
 'src/lua/abyss_relic_card_rewards.lua':{sha256:'c8e0905f87f77fc9d8296313cd241619278ac73c24a1c2909b806e566838b3fb',gitBlob:'49f4fd395b5abc046a237898cf61b0a3d6a27127'},
 'src/lua/abyss_relic_choices.lua':{sha256:'0a56dd716ccd996d14e70b9e0239db7f749e753349248d41e92cbd166e324e4e',gitBlob:'ce47be3293cd3ee262971e51518bb827f2c9b3e3'},
 'src/lua/abyss_relic_pending.lua':{sha256:'471aafeb33a1868158723ce9e5ec231b12e186ae2f94e8de045cd1dc9c4a08d6',gitBlob:'5dfa1dd5f4aa68663770f565c3df1b50a87f08be'},
});
const configTokens='3924ed90aa88922ca9fc97df398cb67b7cf61892933901213ef911fc3b6f3e52';
const eventsPath='src/lua/abyss_node_ui_events.lua';
const eventsOwner=Object.freeze({sha256:'a9b646cb40b5cdd288ddbcf75b4ac4e7dc12537a2002b0ba0774681521d50b61',gitBlob:'8fc53f516f083aeb4c7a5e05ed626b595114fef7'});
let receipts;
function rewardSourceFiles(){
 receipts??=releaseUiRestoreArchive(
  readFileSync(new URL('./reward-current-source.json.gz',import.meta.url)),
  'a68d10abe6e6f3bd33a69f85326d34dce1250b34b6892543cb5c1314c01f3b9f','02dcb2466b2c90308f9a9e42896c2c5af3ed288c');
 return receipts.files;
}
function freshOwner(read,path){
 try{return read(path);}
 catch(error){assert.fail('combined linked owner missing: '+path+': '+String(error?.message??error));}
}

function requireRetiredController(read){
 try{
  const controller=readRetiredController(read);
  assert(controller.restored,'current Controller source has been retired');
 }catch(error){
  assert.fail('combined linked owner identity: '+retiredControllerPath+': '+String(error?.message??error));
 }
}

// Only the current reward entry inputs select this narrower historical reader.
// Historical-only callers continue through the verifier they already use.
export function currentRewardReplay(path,source,read){
 if(path!==config&&!Object.hasOwn(rewardHosts,path))return {source,read};
 const files=rewardSourceFiles(),anchor=files[config];
 const recognized=path===config
  ?exactSourceMatches(source,anchor.after)||sourceConfigLayoutMatches(source,configTokens)
  :exactSourceMatches(source,rewardHosts[path]);
 if(!recognized)return {source,read};
 assert.equal(typeof read,'function','combined linked owner reader');
 if(path!==config&&!exactSourceMatches(freshOwner(read,config),anchor.after))return {source,read};
 requireRetiredController(read);
 return {
  source:path===config?anchor.before.source:source,
  read(owner){
   if(owner===retiredControllerPath){
    requireRetiredController(read);
    return undefined;
   }
   const live=freshOwner(read,owner);
   if(owner===eventsPath)assert(exactSourceMatches(live,eventsOwner),'combined linked owner identity: '+owner);
   if(!Object.hasOwn(files,owner))return live;
   const row=files[owner];
   assert(exactSourceMatches(live,row.after),'combined linked owner identity: '+owner);
   return live.includes('\r\n')?row.before.source.replaceAll('\n','\r\n'):row.before.source;
  }
 };
}
