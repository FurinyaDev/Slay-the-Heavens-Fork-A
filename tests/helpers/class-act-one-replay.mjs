// Opt-in offline evidence. From the repository root:
// npm run build:data && npm run build:ui && node tests/helpers/class-act-one-replay.mjs
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const classes = ['silent', 'defect', 'watcher'];
const [character, ...extra] = process.argv.slice(2);
if (extra.length || (character && !classes.includes(character))) {
  throw Error('Usage: node tests/helpers/class-act-one-replay.mjs [silent|defect|watcher]');
}

const cli = require.resolve('fengari-node-cli/src/lua-cli.js');
for (const id of character ? [character] : classes) {
  const command = `CLASS_REPLAY_CHARACTER=${JSON.stringify(id)};dofile('tests/lua/support/class_act_one_replay.lua')`;
  const result = spawnSync(process.execPath, [cli, '-e', command], { stdio: 'inherit', timeout: 180_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${id} replay failed (${result.status ?? result.signal})`);
}
