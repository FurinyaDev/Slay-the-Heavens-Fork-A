import { verifyUploadedArtifact } from '../scripts/gil-candidate.mjs';

const request = async (path, signed) => {
  const response = await fetch(`${process.env.GITHUB_API_URL}/repos/${process.env.GITHUB_REPOSITORY}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
    redirect: signed ? 'manual' : 'error', signal: AbortSignal.timeout(20000),
  });
  if (signed) return response.status === 302 ? response.headers.get('location') : null;
  if (!response.ok) throw Error(`GitHub Artifact metadata failed with HTTP ${response.status}`);
  return response.json();
};

await verifyUploadedArtifact({ id: process.env.ARTIFACT_ID, runId: process.env.GITHUB_RUN_ID,
  name: 'gil-download-link-smoke', archiveDigest: process.env.ARTIFACT_DIGEST }, request);
console.log('Signed download completed and compressed archive SHA-256 matched the upload.');
