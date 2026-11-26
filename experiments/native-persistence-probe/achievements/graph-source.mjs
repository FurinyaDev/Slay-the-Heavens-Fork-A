const ACTIONS = ['query', 'setPartial', 'addOne', 'setThreshold', 'guardedSet', 'settle'];

export function achievementProbeSource({ graphId, graphName, serial, threshold, buttonIndices }) {
  for (const value of [graphId, serial, threshold, ...ACTIONS.map(action => buttonIndices[action])]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Expected a nonnegative integer identifier or count');
  }
  if (!graphId || !/^_GSTS_[A-Za-z0-9_]+$/.test(graphName) || threshold < 2) {
    throw new Error('Use an actual _GSTS_ graph ID/name and a threshold of at least 2');
  }
  if (new Set(ACTIONS.map(action => buttonIndices[action])).size !== ACTIONS.length) {
    throw new Error('Interaction buttons must have distinct control group indices');
  }

  return `/// <reference types="genshin-ts" />
import { g } from 'genshin-ts/runtime/core'
import { SettlementStatus } from 'genshin-ts/definitions/enum'

g.server({ id: ${graphId}, name: ${JSON.stringify(graphName)} })
.on('whenEntityIsCreated', (_event, f) => {
  f.printString('EXP_ACH READY');
})
.on('whenUiControlGroupIsTriggered', (event, f) => {
  const player = event.eventSourceEntity;
  const control = event.uiControlGroupIndex;
  const serial = ${serial}n;
  if (control === ${buttonIndices.query}n) {
    if (f.queryIfAchievementIsCompleted(player, serial)) {
      f.printString('EXP_ACH QUERY COMPLETE');
    } else {
      f.printString('EXP_ACH QUERY INCOMPLETE');
    }
  } else if (control === ${buttonIndices.setPartial}n) {
    f.setAchievementProgressTally(player, serial, ${threshold - 1}n);
    f.printString('EXP_ACH SET PARTIAL DISPATCHED');
  } else if (control === ${buttonIndices.addOne}n) {
    f.changeAchievementProgressTally(player, serial, 1n);
    f.printString('EXP_ACH ADD ONE DISPATCHED');
  } else if (control === ${buttonIndices.setThreshold}n) {
    f.setAchievementProgressTally(player, serial, ${threshold}n);
    f.printString('EXP_ACH SET THRESHOLD DISPATCHED');
  } else if (control === ${buttonIndices.guardedSet}n) {
    if (f.queryIfAchievementIsCompleted(player, serial)) {
      f.printString('EXP_ACH GUARDED ALREADY COMPLETE');
    } else {
      f.setAchievementProgressTally(player, serial, ${threshold}n);
      f.printString('EXP_ACH GUARDED SET DISPATCHED');
    }
  } else if (control === ${buttonIndices.settle}n) {
    for (const playerOnField of f.getListOfPlayerEntitiesOnTheField()) {
      f.setPlayerSettlementSuccessStatus(playerOnField, SettlementStatus.Victory);
    }
    f.printString('EXP_ACH SETTLEMENT DISPATCHED');
    f.settleStage();
  }
});
`;
}
