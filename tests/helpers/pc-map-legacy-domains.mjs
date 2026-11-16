// Explicit adapters; the original packet, Git witnesses and schema are immutable.
export {releaseMergeCiPacket,assertReleaseMergeGitProvenance,releaseMergeArchivedGitRead} from './release-bootstrap-merge-ci-source.mjs';
export {pcDomainRead as releaseMergeRead,pcDomainSource as releaseMergeSource,assertPcDomainCurrent as assertReleaseMergeCurrent} from './pc-map-integration.mjs';
