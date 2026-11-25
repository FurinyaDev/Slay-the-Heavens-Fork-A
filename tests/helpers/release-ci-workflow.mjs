import {createHash} from 'node:crypto';

// Invert this single reviewed publication gate for immutable historical tests.
// Keep arbitrary/partial workflow changes visible to their original guards.
export const releaseFullGate = `      - name: Require frozen Release Full before publication
        if: github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'master' && startsWith(github.event.pull_request.head.ref, 'release/')
        env:
          GH_TOKEN: \${{ github.token }}
        run: node scripts/release-ci.mjs verify-pr
`;
export const hotfixPublicationGate = `      - name: Require frozen Hotfix Full and formal performance before publication
        if: github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'master' && startsWith(github.event.pull_request.head.ref, 'hotfix/')
        env:
          GH_TOKEN: \${{ github.token }}
        run: node scripts/release-ci.mjs verify-hotfix-pr
`;
export function beforeHotfixPublicationGate(source) {
 const eol=source.includes('\r\n')?'\r\n':'\n',hotfix=hotfixPublicationGate.replaceAll('\n',eol);
 const original=releaseFullGate.replaceAll('\n',eol);
 const digest=createHash('sha256').update(source.replaceAll('\r\n','\n')).digest('hex');
 if(digest!=='280d7e3f58ddb88935cbd2e0b0f1e1bdc74ceff1858f5a3b0b03f48b8152aef1')return source;
 return source.replace(original+hotfix,original);
}
export function beforeReleaseFullGate(source) {
 source=beforeHotfixPublicationGate(source);
 const eol=source.includes('\r\n')?'\r\n':'\n',block=releaseFullGate.replaceAll('\n',eol);
 return source.split(block).length===2?source.replace(block,''):source;
}
