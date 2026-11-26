import {preCloseoutCiSource,closeoutInventory,closeoutRead} from './closeout-ci-source.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeVersionGovernanceSource} from './version-governance-source.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {beforeKnownMasterBackflowSource} from './master-backflow-source.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const historyBytes=readFileSync(new URL('../fixtures/pr-history-receipt-continuation.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
if(hash(historyBytes)!=='b1285eef27a83f1296f2ed9e7f5a5d3f1a3dd118b14935044532104833a91717')throw Error('Invalid history receipt continuation');
const historyProof=JSON.parse(historyBytes);
for(const side of ['before','after'])if(hash(historyProof[side].source)!==historyProof[side].sha256)throw Error('Invalid complete history receipt source');
const bytes=readFileSync(new URL('../fixtures/integration-1111-tooling.json',import.meta.url));
if(hash(bytes)!=='33cb2a7b903996de898cdb44ead70d03a7a48c4048c53de9c6151863db347458')throw Error('Invalid integration tooling witness');
export const toolingProof=JSON.parse(bytes);
const officialCardsPath='data/cards.json';
const reviewedCardsAfter={sha256:'7794eaabe6f17e0c6c4f08d2a6f7a0e2bc479e4ef8a01c010ce90cded752adbf',
 gitBlob:'004e4ac437b847c0bc6dd8f00e8c65224039ff23'};
const reviewedCardsBefore={sha256:'9f71d4f84795dbbd364b6ea4f82e8e0265ace3020b0b07815b33c5e316d6a47b',
 gitBlob:'3c4abaf408ca51eef83a6e6c3cd759da47b86133'};
const reviewedCardsName={path:officialCardsPath,beforeSha256:reviewedCardsBefore.sha256,afterSha256:reviewedCardsAfter.sha256,
 hunks:[{at:2003,before:'      "name": "掘尸",',after:'      "name": "重拾旧策",'}]};

function beforeOfficialReceiptCards(path,source){
 if(typeof source!=='string')return source;
 const sourceLf=source.replaceAll('\r\n','\n');
 if(source!==sourceLf&&source!==sourceLf.replaceAll('\n','\r\n'))return source;
 const candidate=beforeKnownMasterBackflowSource(path,source);
 if(!exactSourceMatches(candidate,reviewedCardsAfter))return source;
 const prior=restoreExactFixtureHunks(reviewedCardsName,path,candidate);
 if(!exactSourceMatches(prior,reviewedCardsBefore))throw Error('Invalid exact official cards receipt predecessor');
 return source===sourceLf?prior:prior.replaceAll('\n','\r\n');
}

const officialRelicQueuesPath='data/catalogs/sts1-class-relic-queues.json';
const releasedRelicQueues={sha256:'60bfe3ac6381f8a3fbb6040ff99aaa1892d8de5fa4db309a99e376eb8bf7cb99',
 gitBlob:'8458614e8b3c5e336c9d96f2079b0b0016546a54'};
const priorRelicQueues={sha256:'a1dabc16c2e68668666fe18abd2936a554e9f9ab633c3d1d96ff7c10b50f05bf',
 gitBlob:'ec97a3feb97ec66982c00b06f4445cc8b6db9424'};
function beforeOfficialReceiptRelicQueues(source){
 if(!exactSourceMatches(source,releasedRelicQueues))return source;
 const lf=source.replaceAll('\r\n','\n');
 if(source!==lf&&source!==lf.replaceAll('\n','\r\n'))return source;
 // #951 renamed these existing queue entries and eligibility keys in place.
 const prior=source.replaceAll('"Tactical Badge"','"Gambling Chip"').replaceAll('"ArenaCollar"','"SlaversCollar"');
 if(!exactSourceMatches(prior,priorRelicQueues))throw Error('Invalid exact official relic queues receipt predecessor');
 return prior;
}
export function preIntegrationCalibrationSource(path,source){
 if(path==='tests/ci-complete-calibration.test.mjs')source=preCloseoutCiSource(path,source,'pr620');
 if(path!=='tests/ci-complete-calibration.test.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const row=toolingProof.calibration,lf=source.replaceAll('\r\n','\n');
 if(lf!==row.after||hash(lf)!==row.afterSha256)return source;
 if(hash(row.before)!==row.beforeSha256)throw Error('Invalid calibration predecessor');
 return row.before;
}
// Only immutable receipt input authentication uses this view. Production and
// current CI execute the new tools; foreign/partial source remains visible.
export function receiptToolingSource(path,source,view){
 if(view==='official'&&path===officialCardsPath)return beforeOfficialReceiptCards(path,source);
 if(view==='official'&&path===officialRelicQueuesPath)return beforeOfficialReceiptRelicQueues(source);
 if(view==='official'&&path===historyProof.path&&typeof source==='string'&&!source.includes('\r\r\n')){
  const lf=beforeVersionGovernanceSource(path,source).replaceAll('\r\n','\n');
  if(lf===historyProof.after.source&&hash(lf)===historyProof.after.sha256)return historyProof.before.source;
 }
 const allowed=view==='official'&&path==='scripts/check-network-policy.mjs'||view==='curses'&&path==='scripts/lua-quality-metrics.mjs';
 if(allowed)source=preCloseoutCiSource(path,source,'pr620');
 if(!allowed||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const row=toolingProof.files[path],lf=source.replaceAll('\r\n','\n');
 if(hash(lf)!==row.afterSha256||lf!==row.after)return source;
 if(hash(row.before)!==row.beforeSha256)throw Error('Invalid frozen tooling predecessor');
 return row.before;
}
