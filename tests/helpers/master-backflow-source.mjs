import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { exactSourceMatches } from './source-fingerprint.mjs';

const archive = readFileSync(new URL('../fixtures/master-backflow-predecessors.json.gz', import.meta.url));
assert.equal(createHash('sha256').update(archive).digest('hex'), 'b16492b78553e53e675537d95d3f9ef24557d792f657ba41f0f280e43fab325f');
const { develop, master, ledgerPredecessor, files } = JSON.parse(gunzipSync(archive));
assert.equal(develop, 'e483c6a191dc8dd7622e0cb137e7b8581b171af8');
assert.equal(master, 'd96c9f0d7958148ec1bb027f14a3214da81d06b4');
// #1017 adds six reviewed reference origins before #1019 adopts the ledger.
assert.equal(ledgerPredecessor, '67baf53929708e20943c8644ea9234b89b0d0970');

for (const [path, { before, after }] of Object.entries(files)) {
  assert(exactSourceMatches(before.source, before), 'exact Develop predecessor: ' + path);
  assert.match(after.sha256, /^[a-f0-9]{64}$/);
  assert.match(after.gitBlob, /^[a-f0-9]{40}$/);
  assert.notEqual(before.sha256, after.sha256);
}

// #964 and #988 precede the backflow on develop. Bind the merged shop and
// ledger sources and the TASK-116 checkout cleanup alongside the frozen proof.
const updatedSources = new Map([
  ['.gitattributes', ['889f8fcde1d9cd6ec11ca79cec21677612e94b11cb1bfccd53a64fd5a71c06a6', 'dafbf156e289707fd0a9a612badf45794e6d67ba']],
  ['config/ci-media-lfs.json', ['2c8470c78d11cddfa0a33c234f624175636fa5f42fa2a9a558eb92425507ce00', '8e97088d1172eaa434a9f032166ca09325900983']],
  ['docs/legal/assets.json', ['2fd4b435b871db820568656d28d6afb7e755bc08bcc1afd870a53d8dbba57737', '8d2d572f49b288faa19abb5fb516f7f6b00f140f']],
  ['scripts/ci-media-lfs.mjs', ['e0e71dca9c631734d1cf52f9eae7684428095d949eb4b956d592899652ef0d63', '3803eaa2637dc1e8370bf98dba77e82cd52c71d9']],
  ['src/lua/abyss_game_ui.lua', ['607192763b5ed9b93e4be3cb0ebddfae78aabe8710b274104ac26f6cef672e4a', 'c533ebfef1f88c30a4c45cadac43414400f4151e']],
  ['src/lua/abyss_game_ui_lifecycle.lua', ['6e3967351a581630c2c352742fdfc3fecc20fefbaf2c26c7ddc8f21e052b3e14', 'abf67a2ab3994df9058d32a3554420c6317d133c']],
  ['src/lua/abyss_game_ui_navigation.lua', ['8178cf61dd61228c0a53c34f69270ab693de58951446dc9865db53b3fecfc2a2', '1963c48ed871f0b683a29f08d7d3458deb0089b5']],
  ['src/lua/abyss_game_ui_view.lua', ['e0610fe83e363eec39953b814529de730cd223d1ecc365f4d3e6f0b6364d0ae6', '619a50506490dece4f1fb1c79b3d6c6a36bcfa65']],
  ['src/lua/abyss_page_reveal.lua', ['64cd428bc1744eb46ce420f4dd9639673f929ca665de3f32c648fd44e60f6ffb', 'b6af02700b2b0caecec59f89c8910088fe54df2d']],
  ['src/lua/abyss_shop_ui.lua', ['caa2a9e292c671e8caccda3c04905bad9f930b53bb5c52d14491452845b7cb1c', 'e7956c45a252b2595fb5af636b56e3a12d4a4581']],
  ['tests/ci-reviewed-lfs.test.mjs', ['2a9a520742fc514b7edfad5ae8b636caf5834cfd8e7c8cd49b971ea054a9c119', '0d61e4d967a2a9946cd2adb9d32762064215a73c']],
  ['tests/game-ui.test.mjs', ['24e4ac5ceaa35a28372b53ab1e7baf4f0442383b96b0218f7457f94f37e49fec', '69aa3d7748b13116293ae97a31347cca31b6d643']],
  ['tests/helpers/fork-preflight-source.mjs', ['cb6c0ad1e737f50712a5ec25f219a112ef3defdfb4eeb9d6322c7a8202e62a24', '03e4327edef1d4aa5ce1a0b08ff89f7d39f9311f']],
  ['tests/integration-source-epoch.test.mjs', ['fd0cb659920b58cb0354c37acba7344028847c06211bb0339cc0deb38bbc2a8b', '8ec5fab8e038c2b0a3e1201a353283a28f02293f']],
  ['tests/lua/dynamic_monster_input_bindings.lua', ['8f79e3591cbcf361879fd664fc72eb9a495cb1004c22ad5a2b6fa3dff813ec21', '95895f0e46424f30b6f207d44b0891a33cece192']],
  ['tests/lua/support/dynamic_monster_game_ui.lua', ['abfe82b4330839610a3b495db737078ba2f4704ee951e8c1ac53cc8ee8056b94', '05e5c56c220b537f9a5fbaa68e49d0d5345dcdb8']],
]);

function matchesSuccessor(path, source, original) {
  if (exactSourceMatches(source, original)) return true;
  const updated = updatedSources.get(path);
  return updated !== undefined && exactSourceMatches(source, { sha256: updated[0], gitBlob: updated[1] });
}

export function beforeMasterBackflowSource(path, source) {
  if (!Object.hasOwn(files, path)) return source;
  const { before, after } = files[path];
  const buffered = Buffer.isBuffer(source);
  const text = buffered ? source.toString('utf8') : source;
  const message = 'fresh master backflow source: ' + path;
  assert(typeof text === 'string' && (!buffered || Buffer.from(text).equals(source)), message);
  const normalized = text.replaceAll('\r\n', '\n');
  const crlf = normalized !== text;
  assert(!crlf || normalized.replaceAll('\n', '\r\n') === text, message);
  assert(matchesSuccessor(path, text, after), message);
  const predecessor = crlf ? before.source.replaceAll('\n', '\r\n') : before.source;
  return buffered ? Buffer.from(predecessor) : predecessor;
}

export function beforeKnownMasterBackflowSource(path, source) {
  if (!Object.hasOwn(files, path) || !matchesSuccessor(path, source, files[path].after)) return source;
  return beforeMasterBackflowSource(path, source);
}

const replayReaders = new WeakSet();
export function readBeforeMasterBackflowSource(read) {
  if (replayReaders.has(read)) return read;
  const replay = (path, ...args) => beforeMasterBackflowSource(path, read(path, ...args));
  replayReaders.add(replay);
  return replay;
}
