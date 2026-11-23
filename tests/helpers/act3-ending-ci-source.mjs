import assert from 'node:assert/strict';
import {exactSourceMatches as matches} from './source-fingerprint.mjs';

const copierAfter={sha256:'2a83e12b5badc14f59166c0dffaf3b38ca12d20beca80f91d18fb14da54ba568',gitBlob:'daad28c78271921cd4b1b480a81bf7d8d75c6620'};
const copierBefore={sha256:'b4c25c36b3b4858a52aa2a6881c51b4096602843fde95b3b5ef854cf7b07cda3',gitBlob:'a88cb37e7ee39233c13d0974e25a4a7ce342efef'};

export function beforeAct3EndingCopier(source){
 if(!matches(source,copierAfter))return source;
 const predecessor=source.replace('3549fd2269d9185448dd4240b3065be22b56e9ba1fd26c26f70c66488c111699',
  'f1c56304e9847881824326828896d1393ec576d36b46dcac8795ef58f8ce65d0');
 assert(matches(predecessor,copierBefore),'exact Act 3 ending copier predecessor');
 return predecessor;
}

const newTests={
 js:{path:'tests/act3-ending-source-predecessor.test.mjs',sha256:'6f30ca9985230684b0af5f11c822f5d4b401e5cd70b0ab7617273f082ee0d985',gitBlob:'4b192b0652047ec1a4338a14e2c5b5be726bc4cd'},
 lua:{path:'tests/lua/act3_boss_complete_fights.lua',sha256:'45e91a44a802cf0f22e333d704070539eb0ccf67f72c3a933eb73912458a9508',gitBlob:'faec9dc25a4a730a415d9fcc1f6a7a2675dcf065'},
};

export function beforeAct3EndingInventory(paths,kind,read,{required}){
 const binding=newTests[kind],path=binding.path;
 const count=paths.filter(candidate=>candidate===path).length;
 if(!count&&!required)return paths;
 assert.equal(count,1,'complete Act 3 ending '+kind+' inventory: '+path);
 assert(matches(read(path,'utf8'),binding),'fresh added inventory source: '+path);
 return paths.filter(candidate=>candidate!==path);
}
