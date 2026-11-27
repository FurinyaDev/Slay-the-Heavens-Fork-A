import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [toolRoot, output] = process.argv.slice(2);
if (!toolRoot || !output) throw Error('Usage: node prepare-native-fixture.mjs <pinned MCP root> <output directory>');
const mcp = resolve(toolRoot);
const out = resolve(output);
const {removeClient} = await import(pathToFileURL(join(mcp, 'src/scene-save.mjs')));
let mapPath = join(mcp, 'tests/fixtures/editor-2026-10-13-clientkinds.gil');
mkdirSync(out, {recursive: true});
for (const [type, name] of [['ui','CG_ui'],['template','basket'],['template','容器节点'],['script','CG_game']]) {
  ({mapPath} = removeClient({mapPath, [type]: name, outputName: `stage-${type}-${name}`}, out));
}
const digest = createHash('sha256').update(readFileSync(mapPath)).digest('hex');
assert.equal(digest, 'b3b46b0412caf865ebc259c15ad8215b33a1797ab7940861eb562320541e13a2');
copyFileSync(mapPath, join(out, 'native-experiment-base.gil'));
