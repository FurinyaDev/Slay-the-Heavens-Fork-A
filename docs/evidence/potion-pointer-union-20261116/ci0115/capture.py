from pathlib import Path
import subprocess,json,gzip,hashlib,re
r=Path('.')
parents={'potion':'eabff9b0bf2cce17ae05913c0e5d47366d0ff173','pointer':'ad6fe84dbcc11e28e8a82258f889a6841b46c8c6'}
base='29ae8d2cb2a5b729c348191ee56910b1aa77386c'
def blob(ref,p):
 try:b=subprocess.check_output(['git','show',ref+':'+p],stderr=subprocess.DEVNULL)
 except subprocess.CalledProcessError:return None
 if b.startswith(b'version https://git-lfs'):
  sha=re.search(rb'oid sha256:([a-f0-9]+)',b).group(1).decode(); b=(Path('../recovered-repo/.git/lfs/objects')/sha[:2]/sha[2:4]/sha).read_bytes();assert hashlib.sha256(b).hexdigest()==sha
 return b
paths=set(subprocess.check_output(['git','diff','--name-only',parents['potion'],base,'--','src','config','tests']).decode().splitlines())
paths.add('tests/helpers/integrated-ci-source.mjs')
for name in ['potion-post697-ci-source.json.gz','potion-post697-ci-reader-repair.json.gz','potion-post697-ci-matcher-repair.json.gz','battle-pointer-ci-source.json.gz','battle-pointer-sparse-ci-source.json.gz','battle-pointer-inspection-ci-source.json.gz']:
 parent=parents['pointer' if name.startswith('battle') else 'potion']
 data=json.loads(gzip.decompress(blob(parent,'tests/helpers/'+name)))
 paths.update(data.get('files',{}));paths.update(data.get('immutableArchives',{}))
 paths.add('tests/helpers/'+name)

# Retain only extant union inputs. Missing pointer CI/test additions remain explicit later work.
paths={p for p in paths if (r/p).is_file()}
rows={}
for p in sorted(paths):
 b=(r/p).read_bytes(); row={'current':{'sha256':hashlib.sha256(b).hexdigest(),'encoding':'base64' if p.endswith('.gz') else 'utf8'},'views':{}}
 for name,sha in parents.items():
  old=blob(sha,p)
  if old is not None:
   import base64
   row['views'][name]={'sha256':hashlib.sha256(old).hexdigest()}
   if row['views'][name]['sha256']!=row['current']['sha256']:row['views'][name]['source']=base64.b64encode(old).decode() if p.endswith('.gz') else old.decode()
 rows[p]=row
packet={'schemaVersion':1,'normalization':'LF','baseCommit':base,'viewCommits':parents,'scope':'current prepared CI entry; pointer CI tests not yet integrated','files':rows}
b=gzip.compress((json.dumps(packet,ensure_ascii=False,separators=(',',':'))+'\n').encode(),mtime=0)
(r/'tests/helpers/potion-pointer-ci-union.json.gz').write_bytes(b)
p=r/'tests/helpers/potion-pointer-ci-union.mjs';s=p.read_text();s=re.sub(r"const PACKET_SHA='[a-f0-9]*'", "const PACKET_SHA='"+hashlib.sha256(b).hexdigest()+"'",s);p.write_text(s)
print('bound',len(rows),'paths',len(b),'bytes')
