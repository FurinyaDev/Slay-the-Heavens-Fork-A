import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readMappings, verifyMetadata} from '../release-metadata.mjs';
import {githubRequest} from '../release-ci.mjs';

const repo = '/repos/FurinyaWorks/Slay-the-Heavens';
const sha = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
const legacy = {
  version: '2.1.1',
  releaseId: 458194023,
  tag: 'v2.1.1',
  annotatedTag: '43532708d2629200ea1541b49b8a02b7dc6c30da',
  archive: '3f79269e90a8f2507f6782135563ecf573b357d7',
  directory: 'docs/evidence/v2.1.1-2026-11-25',
};

function versionParts(version) {
  assert(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version), 'Engineering SemVer required');
  return version.split('.').map(BigInt);
}

function compareVersions(a, b) {
  const before = versionParts(a), after = versionParts(b);
  for (const index of [0, 1, 2]) {
    if (before[index] < after[index]) return -1;
    if (before[index] > after[index]) return 1;
  }
  return 0;
}

async function listReleases(request) {
  const releases = [];
  for (let page = 1; page <= 100; page++) {
    const rows = await request(`${repo}/releases?per_page=100&page=${page}`);
    assert(Array.isArray(rows), 'Published Releases listing unavailable');
    releases.push(...rows);
    if (rows.length < 100) return releases;
  }
  throw Error('Published Releases listing was incomplete');
}

async function tagCommit(request, tag, pinnedTag) {
  const ref = await request(`${repo}/git/ref/tags/${tag}`);
  assert(ref?.ref === `refs/tags/${tag}` && ref.object?.type === 'tag' && sha.test(ref.object.sha),
    'Published engineering release requires its annotated tag');
  if (pinnedTag) assert.equal(ref.object.sha, pinnedTag, 'Historical annotated release tag changed');
  const annotated = await request(`${repo}/git/tags/${ref.object.sha}`);
  assert(annotated?.sha === ref.object.sha && annotated.tag === tag && annotated.object?.type === 'commit' &&
    sha.test(annotated.object.sha), 'Published tag does not resolve to a commit');
  return annotated.object.sha;
}

async function sourceTree(request, commit) {
  const source = await request(`${repo}/git/commits/${commit}`);
  assert(source?.sha === commit && sha.test(source.tree?.sha), 'Published build tree unavailable');
  return source.tree.sha;
}

async function legacyBaseline(request, release) {
  assert(release && !release.draft && !release.prerelease && release.tag_name === legacy.tag && release.html_url,
    'Published v2.1.1 GitHub Release unavailable');
  const file = await request(`${repo}/contents/${legacy.directory}/build-receipt.json?ref=${legacy.archive}`);
  assert(file?.encoding === 'base64' && typeof file.content === 'string', 'Published legacy build receipt unavailable');
  const receipt = JSON.parse(Buffer.from(file.content, 'base64'));
  assert(receipt.version === legacy.tag && receipt.sourceDirty === false && sha.test(receipt.sourceCommit) &&
    digest.test(receipt.sha256) && /^slay-the-heavens-v2\.1\.1-2026-11-25\.gil$/.test(receipt.filename) &&
    release.body.includes(`正式构建源码 \`${receipt.sourceCommit}\``) &&
    release.body.includes(`SHA-256 \`${receipt.sha256}\``) &&
    release.body.includes(`blob/${legacy.archive}/${legacy.directory}/${receipt.filename}`),
    'Published Release and archived legacy build receipt differ');
  const tagSource = await tagCommit(request, legacy.tag, legacy.annotatedTag);
  assert.equal(tagSource, release.target_commitish, 'Legacy tag differs from the publication record');
  const tree = await sourceTree(request, receipt.sourceCommit);
  assert.equal(await sourceTree(request, tagSource), tree, 'Legacy release tag and actual build source trees differ');
  return {version: legacy.version, commit: receipt.sourceCommit, tree, gilSha256: receipt.sha256,
    source: release.html_url, releaseId: legacy.releaseId};
}

export async function resolvePublishedBaseline(candidateVersion, request = githubRequest) {
  versionParts(candidateVersion);
  const releases = await listReleases(request);
  const matches = readMappings(releases).filter(row =>
    row.platform_version !== null && compareVersions(row.version, candidateVersion) < 0 &&
    compareVersions(row.version, legacy.version) > 0);
  matches.sort((a, b) => compareVersions(b.version, a.version));
  const newest = matches[0];
  if (!newest) {
    assert(compareVersions(legacy.version, candidateVersion) < 0, 'No earlier published engineering build');
    return legacyBaseline(request, releases.find(row => row.id === legacy.releaseId));
  }
  const release = releases.find(row => row.tag_name === newest.tag);
  const commit = await tagCommit(request, newest.tag);
  const metadata = verifyMetadata(release, commit, newest.version);
  return {version: metadata.version, commit, tree: await sourceTree(request, commit),
    gilSha256: metadata.artifact.sha256, source: release.html_url, releaseId: release.id};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    assert.equal(process.argv.length, 3, 'Use published-baseline.mjs <candidate-engineering-version>');
    console.log(JSON.stringify(await resolvePublishedBaseline(process.argv[2])));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
