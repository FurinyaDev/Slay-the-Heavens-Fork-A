import {productionPhases} from '../../scripts/runtime-baseline/production-inputs.mjs';
import {formalImageId, profiles, productionHeapMiB, productionReportKind, resourceImage} from '../../scripts/runtime-baseline/resource-receipt.mjs';

export const head = 'a'.repeat(40);
export const tree = 'b'.repeat(40);
export const published = {commit:'c'.repeat(40), tree:'e'.repeat(40)};
export const sha256 = 'd'.repeat(64);
export const flags = {cards:false, menuBackground:false, selectionAvatar:true, battlePortrait:true, monsters:true};
export const receipt = {artFeatures:{flags}};

export function reportFixture() {
  const evidence = {
    tree, workloadSha256:sha256, generatedLuaSha256:sha256, lockfile:{dependencies:sha256},
    configuration:{officialAssets:true, refinedReleaseMonsterArt:true, nativePageLifecycle:true, artFeatures:flags},
  };
  let sequence = 0;
  const results = Object.fromEntries(Object.entries(profiles).map(([name, profile]) => {
    const rows = productionPhases.map(phase => ({
      phase, elapsedMs:1, requireCalls:1, moduleLoads:1, nativeCalls:1, propertyWrites:1, snapshots:1,
      nativeMethods:{GetChild:1}, propertyNames:{visible:1}, memory:{rss:1, heapUsed:1},
    }));
    const resources = {
      cpuMax:profile.cpus === null ? 'max 100000' : `${profile.cpus * 100000} 100000`,
      memoryMax:String(profile.memoryBytes ?? 'max'), swapMax:profile.memoryBytes === null ? 'max' : '0',
      oom:0, oomKill:0, peakBytes:100, cpuUsageUsec:1, cpuPeriods:1, throttledPeriods:0, throttledUsec:0,
    };
    const arm = () => structuredClone({samples:Array.from({length:3}, () => ({rows, resources, wallMs:1,
      executionId:(++sequence).toString(16).padStart(12, '0')})), pass:true});
    const pairOrder = [['baseline', 'candidate'], ['candidate', 'baseline'], ['baseline', 'candidate']];
    return [name, {profile, pairOrder, candidate:arm(), baseline:arm(), comparisonStatus:'PAIRED', signals:[]}];
  }));
  const candidate = {commit:head, ...evidence};
  const extreme = {
    status:'PASS', candidate,
    probe:{containerId:'a'.repeat(64), executionId:'a'.repeat(12), resources:{cpuMax:'50000 100000', memoryMax:'134217728', swapMax:'0'},
      state:{Running:false, OOMKilled:true, ExitCode:137, StartedAt:'2026-11-25T11:02:00Z', FinishedAt:'2026-11-25T11:02:01Z'},
      stdout:'RESOURCE_EXECUTION_ID aaaaaaaaaaaa\nRESOURCE cpu.max 50000 100000\nRESOURCE memory.max 134217728\nRESOURCE memory.swap.max 0\n'},
    recovery:{recordedAt:'2026-11-25T11:03:00Z', sample:{...structuredClone(results.stress.candidate.samples[0]), executionId:'b'.repeat(12)}},
  };
  return structuredClone({
    schemaVersion:1, release:true, kind:productionReportKind, status:'PASS', mode:'full', comparisonStatus:'PAIRED',
    seed:42, alertPercent:20, repetitions:3, timeUtc:'2026-11-25T12:00:00Z',
    engine:{cpuModel:'fixture', kernel:'fixture', arch:'x64', docker:'28.4.0 2 linux amd64', imageId:formalImageId,
      image:resourceImage, productionHeapMiB},
    candidate, baseline:{...evidence, ...published}, results, extreme,
  });
}
