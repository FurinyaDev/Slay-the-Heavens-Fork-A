import assert from 'node:assert/strict';
import {exactSourceMatches as matches} from './source-fingerprint.mjs';

const copierAfter={sha256:'f0f713fa80d5b32ab6da5d6b90020b806062d30667df191fe22e0862118f2ed2',gitBlob:'39cedb941b099397f3b2ed871517a498fc92dcc6'};
const copierBefore={sha256:'1c6fb395d316833f309f3574faeb6b1930f7ea01ff540d40a82f8cad25a803c0',gitBlob:'d986351a338f04b2bc7ae63f2ee199670f393607'};

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
