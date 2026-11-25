import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {toLua} from '../../scripts/build-lua-data.mjs';
import {runLua} from '../../scripts/test-lua.mjs';
export const fixture=JSON.parse(readFileSync('tests/fixtures/sts1-merchant-chain.json'));
const ordinaryQueues=JSON.parse(readFileSync('tests/fixtures/sts1-relic-pool-vectors.json')).cases[0].queues;
const membershipQueues=JSON.parse(readFileSync('tests/fixtures/economy-relic-seeds.json')).membership.queues;
// Compare exact released labels without changing the host-Java vectors,
// their queue order, or the live RNG/transaction state.
const releasedRelicIds=new Map([['Gambling Chip','Tactical Badge'],['SlaversCollar','ArenaCollar']]);
const releasedPotionIds=new Map([['SteroidPotion','SurgePotion'],['GamblersBrew','SwapBrew']]);
const relicId=id=>releasedRelicIds.get(id)??id;
const releaseQueues=queues=>Object.fromEntries(Object.entries(queues)
 .map(([tier,ids])=>[tier,ids.map(relicId)]));
const releaseStep=step=>({...step,queues:releaseQueues(step.queues),
 potions:step.potions.map(row=>({...row,sourceId:releasedPotionIds.get(row.sourceId)??row.sourceId})),
 relics:step.relics.map(row=>({...row,sourceId:relicId(row.sourceId),rejected:row.rejected.map(relicId)}))});
export function execute(caseId,prelude=''){
 const sample=fixture.cases.find(c=>c.caseId===caseId);assert.ok(sample);
 const queues=sample.membershipPurchase?membershipQueues:ordinaryQueues;
 const dir=mkdtempSync(join(tmpdir(),'merchant-chain-'));
 try{const path=join(dir,'case.lua');writeFileSync(path,`${prelude}\ndofile('tests/lua/support/merchant_chain.lua')(${toLua({...sample,steps:sample.steps.map(releaseStep)})},${toLua(releaseQueues(queues))},${toLua(['e8b4b3b1c77c4573','14fc879e54fc55f0'])})`);return runLua(path);}
 finally{rmSync(dir,{recursive:true,force:true});}
}
export function verify(caseId){const r=execute(caseId);assert.equal(r.status,0,r.stdout+r.stderr);assert.ok(r.stdout.includes(`MERCHANT_CHAIN_PASS ${caseId}`));}
