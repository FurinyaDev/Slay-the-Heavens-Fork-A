import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {productionWorkload, workloadIdentity} from './resource-receipt.mjs';
import {verifyResourceReport} from './verify-release-performance.mjs';
import {sha256} from './release-performance-artifacts.mjs';
import {frozenPerformanceInputs} from './frozen-performance-inputs.mjs';
import {gilModuleInventoryHash} from './gil-inputs.mjs';

try {
  const {target, tree, runId, attempt, fromHead, receipt, gil, published} = await frozenPerformanceInputs();
  const raw = readFileSync('build/performance-regression/report.json');
  const report = JSON.parse(raw);
  const workloadSha256 = workloadIdentity(productionWorkload, fromHead);
  const signals = verifyResourceReport(report, target.head, tree, published, receipt, workloadSha256);
  assert.deepEqual(signals, {}, 'Formal performance regression signals require resolution');
  const output = 'build/release-performance';
  mkdirSync(output, {recursive:true});
  writeFileSync(output + '/report.json', raw, {flag:'wx'});
  writeFileSync(output + '/evidence.json', JSON.stringify({
    schemaVersion:1, kind:'release-performance', source:{...target, tree}, runId, attempt, gil, published,
    workloadSha256, reportSha256:sha256(raw), artFeatures:receipt.artFeatures,
    moduleDigestsSha256:gilModuleInventoryHash(receipt.moduleDigests),
  }, null, 2) + '\n', {flag:'wx'});
  console.log('Release performance evidence sealed for ' + target.head + ' / ' + gil.gilSha256);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
