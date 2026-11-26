import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
import {runLua} from '../scripts/test-lua.mjs';

test('official shop buys the same potion immediately after discarding from a full belt', t => {
  const generated=mkdtempSync(join(tmpdir(),'official-shop-potion-'));
  t.after(()=>rmSync(generated,{recursive:true,force:true}));
  buildLuaData('data',join(generated,'abyss_data.lua'));
  buildUI(generated,undefined,{officialAssets:true,nativePageLifecycle:true});
  const modules=readdirSync(generated).filter(name=>name.endsWith('.lua')).map(name=>name.slice(0,-4));
  const entry=join(generated,'shop-potion.lua');
  writeFileSync(entry,`
local generated = ${luaString(generated.replaceAll('\\\\','/'))}
for _,name in ipairs(${toLua(modules)}) do
  package.preload[name] = assert(loadfile(generated..'/'..name..'.lua'))
end
assert(require('abyss_ui_profile').nativePageLifecycle)
dofile('tests/lua/support/official_shop_potion_retry.lua')
`);
  const result=runLua(entry);
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/OFFICIAL_SHOP_POTION_DISCARD_PASS/);
});
