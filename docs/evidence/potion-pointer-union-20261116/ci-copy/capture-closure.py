from pathlib import Path
import re,json,hashlib
r=Path('.'); seen=set();todo=['tests/helpers/integrated-ci-source.mjs','tests/helpers/copy-integration-source-closure.mjs','tests/helpers/potion-pointer-ci-before-copy.json.gz'];exclude={'tests/helpers/copy-integration-source-closure.mjs','tests/helpers/potion-pointer-ci-union.mjs','tests/helpers/potion-pointer-ci-union.json.gz','tests/helpers/potion-pointer-ci-copy-closure.json'}
import gzip
prior=json.loads(gzip.decompress((r/'tests/helpers/potion-pointer-ci-before-copy.json.gz').read_bytes()))
todo.extend(p for p in prior['files'] if p.startswith(('tests/helpers/','tests/fixtures/')))
while todo:
 p=todo.pop()
 if p in seen:continue
 seen.add(p)
 if not (r/p).exists():raise Exception('missing '+p)
 if not p.endswith('.mjs'):continue
 s=(r/p).read_text()
 for dep in re.findall(r"(?:from\s+|import\s*\(|new URL\()\s*['\"]([^'\"]+)['\"]",s):
  if dep.startswith('.'):
   q=str((Path(p).parent/dep).resolve().relative_to(r.resolve()))
   if q.startswith('tests/helpers/') or q.startswith('tests/fixtures/'):todo.append(q)
 for q in re.findall(r"['\"](tests/(?:helpers|fixtures)/[^'\"]+)['\"]",s):
  if(r/q).is_file():todo.append(q)
# dynamic binary predecessor records are authenticated by integratedRead
import gzip
packet=json.loads(gzip.decompress((r/'tests/helpers/integrated-ci-source.json.gz').read_bytes()))
for row in packet.get('binaryViews',{}).values():
 for v in row.get('views',{}).values():seen.add(v['path'])
files={}
for p in sorted(seen-exclude):
 b=(r/p).read_bytes()
 if p.endswith(('.mjs','.js','.json','.lua','.md','.yml','.yaml')):b=b.replace(b'\r\n',b'\n')
 files[p]=hashlib.sha256(b).hexdigest()
p=r/'tests/helpers/potion-pointer-ci-copy-closure.json';p.write_text(json.dumps({'schemaVersion':1,'predecessorCommit':'0e1eae89f1240572a35f34af5cb07dd0c3816a92','files':files},indent=2)+'\n')
print(len(files),hashlib.sha256(p.read_bytes()).hexdigest())
