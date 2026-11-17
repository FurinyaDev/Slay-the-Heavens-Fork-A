from pathlib import Path
import json,gzip,hashlib,subprocess,re,posixpath
base='0e1eae89f1240572a35f34af5cb07dd0c3816a92'
if subprocess.run(['git','cat-file','-e',base],stderr=subprocess.DEVNULL).returncode:base='897015390ffc30a66b62a0cf18b692626b6a9b12'
assert subprocess.check_output(['git','rev-parse',base+'^{tree}']).decode().strip()=='302114977ea6680fa0f25f1f2223df0cc551bbde'
def old(p):return subprocess.check_output(['git','show',base+':'+p])
copier='tests/helpers/copy-integration-source-closure.mjs';packet='tests/helpers/potion-pointer-ci-union.json.gz';manifest='tests/helpers/potion-pointer-ci-copy-closure.json'
assert Path(copier).read_bytes().startswith(old(copier)),'old product-only code modified'
a=json.loads(gzip.decompress(old(packet)));b=json.loads(gzip.decompress(Path(packet).read_bytes()))
assert set(b['files'])==set(a['files'])|{manifest} and len(b['files'])==193
for p,row in a['files'].items():
 q=b['files'][p]
 if p!=copier:assert row==q,p
 else:
  assert row['views']==q['views'],p
assert Path('tests/helpers/potion-pointer-ci-before-copy.json.gz').read_bytes()==old(packet)
m=json.loads(Path(manifest).read_bytes());assert m['predecessorCommit']=='0e1eae89f1240572a35f34af5cb07dd0c3816a92'
trust={copier,'tests/helpers/potion-pointer-ci-union.mjs',packet,manifest};files=set(m['files'])|trust
assert len(m['files'])==246 and len(files)==250 and not(set(m['files'])&trust)
for p,sha in m['files'].items():
 raw=Path(p).read_bytes()
 if re.search(r'\.(mjs|js|json|lua|md|yml|yaml)$',p):raw=raw.decode().replace('\r\n','\n').encode()
 assert hashlib.sha256(raw).hexdigest()==sha,p
seen=set();todo=[copier,'tests/helpers/integrated-ci-source.mjs','tests/helpers/potion-pointer-ci-union.mjs'];edges=0
while todo:
 p=todo.pop()
 if p in seen:continue
 seen.add(p);assert p in files,p
 if not p.endswith('.mjs'):continue
 for dep in re.findall(r'''(?:from\s*|import\s*\(|new URL\s*\()\s*['"](\.[^'"]+)['"]''',Path(p).read_text()):
  q=posixpath.normpath(posixpath.join(posixpath.dirname(p),dep));assert q in files,(p,q);edges+=1;todo.append(q)
for p in b['files']:
 if p.startswith(('tests/helpers/','tests/fixtures/')):assert p in files,p
for p in ['src','data','config','tests/ci-complete-calibration.test.mjs','tests/integrated-ci-source.cases.mjs','tests/release-selection-map-source.test.mjs']:
 assert not subprocess.check_output(['git','diff',base,'--',p]),p
print('Independent structure PASS: prior product copier prefix unchanged; exact prior packet; 191 untouched rows and all prior views; 193 bound inputs; 246 fixed + 4 trust roots; all declared root-import/static-data edges covered:',edges,'edges,',len(seen),'reachable files; all current helper/fixture inputs included; consumers/products unchanged.')
