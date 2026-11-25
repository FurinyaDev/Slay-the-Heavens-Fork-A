import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildLuaData} from '../scripts/build-lua-data.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
import {runLua} from '../scripts/test-lua.mjs';
import {nodeLayout} from '../scripts/node-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';

test('only the precise shop dismissal background is a nonfocusable bottom input layer',()=>{
  const panel=nodeLayout().controls[0];
  const index=panel.children.findIndex(c=>c.name==='shopDismiss');
  const dismiss=panel.children[index];
  assert.equal(dismiss.kind,'cursorArea');
  assert.equal(dismiss.focusable,false);
  assert.deepEqual(dismiss.position,[0,0]);
  assert.deepEqual(dismiss.size,nativeTheme.canvas.base);
  assert.ok(panel.children.findIndex(c=>c.name==='backdrop')<index);
  assert.equal(panel.children[index-2].name,'shopRoom');
  const shade=panel.children[index-1];
  assert.equal(shade.name,'shopShade');
  assert.equal(shade.kind,'image','transition shade adds paint only, never an input area');
  assert.notEqual(shade.focusable,true);
  assert.notEqual(shade.raycastTarget,true);
  assert.equal(shade.visible,false,'transition shade starts hidden');
  for(const name of ['shopView','merchant','back','confirm']) {
    assert.ok(panel.children.findIndex(c=>c.name===name)>index,name);
  }
});

test('shop outside dismissal preserves current selection and purchase ownership',()=>{
  const result=runLua('tests/lua/shop_dismiss.lua');
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/SHOP_DISMISS_PASS 12/);
});

test('the release UI profile keeps all shop dismissal and purchase cases',t=>{
  const out=mkdtempSync(join(tmpdir(),'abyss-release-shop-dismiss-'));
  t.after(()=>rmSync(out,{recursive:true,force:true}));
  buildLuaData('data',join(out,'abyss_data.lua'));
  buildUI(out,undefined,{officialAssets:true,nativePageLifecycle:true});
  const path=out.replaceAll('\\','/')+'/?.lua;./src/lua/?.lua;;';
  const lua=createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
  const result=spawnSync(process.execPath,[lua,'-e',"dofile('tests/lua/shop_dismiss.lua')"],{
    encoding:'utf8',timeout:30000,env:{...process.env,LUA_PATH:path,LUA_PATH_5_3:path,LUA_INIT:'',LUA_INIT_5_3:''},
  });
  assert.ifError(result.error);
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/^SHOP_DISMISS_PASS 12$/m);
});
