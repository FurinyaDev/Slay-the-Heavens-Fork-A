export function bridgeGraphSource({ id, name } = {}) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new TypeError('Use the graph ID returned by scene_add_graph');
  if (typeof name !== 'string' || !name.trim()) throw new TypeError('Use the graph name returned by scene_add_graph');

  return `/// <reference types="genshin-ts" />
import { g, defineSignal } from 'genshin-ts/runtime/core'

const request = defineSignal('STH_EXP_BRIDGE_REQUEST', [['operation', 'int'], ['sequence', 'int'], ['value', 'int']] as const)
const reply = defineSignal('client:STH_EXP_BRIDGE_REPLY', [['player', 'entity'], ['sequence', 'int'], ['status', 'int'], ['value', 'int']] as const)

g.server({id:${id},name:${JSON.stringify(name)}})
.onSignal(request, (event, f) => {
  const source = event.signalSourceEntity;
  const sequence = event.params.sequence;
  const value = event.params.value;
  f.printString('STH_EXP_BRIDGE rx');
  f.printString(f.dataTypeConversion(sequence, 'str'));
  for (const player of f.getListOfPlayerEntitiesOnTheField()) {
    if (source !== (player as unknown as typeof source)) continue;
    if (event.params.operation === 3n) {
      f.printString('STH_EXP_BRIDGE intentionally_no_reply');
      return;
    }
    if (event.params.operation !== 1n || sequence !== 1n) {
      f.sendSignal(reply, player, sequence, 4n, value);
      return;
    }
    const previousSequence = f.getCustomVariable(player, 'STH_EXP_BRIDGE_SEQUENCE').asType('int');
    if (previousSequence === sequence) {
      const previousValue = f.getCustomVariable(player, 'STH_EXP_BRIDGE_VALUE').asType('int');
      if (previousValue === value) f.sendSignal(reply, player, sequence, 2n, previousValue);
      else f.sendSignal(reply, player, sequence, 3n, previousValue);
      return;
    }
    f.setCustomVariable(player, 'STH_EXP_BRIDGE_VALUE', value, false);
    f.setCustomVariable(player, 'STH_EXP_BRIDGE_SEQUENCE', sequence, false);
    const readback = f.getCustomVariable(player, 'STH_EXP_BRIDGE_VALUE').asType('int');
    if (readback === value) f.sendSignal(reply, player, sequence, 1n, readback);
    else f.sendSignal(reply, player, sequence, 5n, readback);
    return;
  }
  f.printString('STH_EXP_BRIDGE source_not_player');
})
`;
}
