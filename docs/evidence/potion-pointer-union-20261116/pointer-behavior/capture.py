from pathlib import Path
import subprocess,json,gzip,hashlib,re
r=Path('.'); prior='0d379cd3d14b7fdce9ffd790d205b1033589e8d5'; remote='1b3b5834ddf8deaf73c3cd392e496b3aca7e085f'
assert subprocess.check_output(['git','rev-parse',prior+'^{tree}']).decode().strip()=='1f757a051f1eca6d96a70d11385532d9e30a9fc8'
def blob(p,ref=prior):return subprocess.check_output(['git','show',ref+':'+p],stderr=subprocess.DEVNULL)
def sha(b):return hashlib.sha256(b).hexdigest()
old=blob('tests/helpers/potion-pointer-ci-union.json.gz');assert sha(old)=='c3b5c1472a46517f1dd3c636cb9a639737829782a4b8651faeb1f12523193345'
archive='tests/helpers/potion-pointer-ci-before-behavior.json.gz';(r/archive).write_bytes(old)
m='tests/helpers/potion-pointer-ci-copy-closure.json';manifest=json.loads(blob(m));manifest['files'][archive]=sha(old);manifest['files']=dict(sorted(manifest['files'].items()));(r/m).write_text(json.dumps(manifest,indent=2)+'\n')
copier='tests/helpers/copy-integration-source-closure.mjs';(r/copier).write_text(blob(copier).decode().replace(sha(blob(m)),sha((r/m).read_bytes())))
packet=json.loads(gzip.decompress(old));packet['behaviorPredecessorCommit']=remote;packet['behaviorPredecessorSha256']=sha(old);packet['scope']='original pointer Lua behavior regression restored; six pointer CI helpers and assertions pending'
changed=['tests/mobile-card-release.test.mjs',copier,m,'tests/lua/support/battle_pointer_identity_cases.lua','tests/lua/support/battle_sparse_pointer_cases.lua']
for p in changed:
 row=packet['files'].get(p,{'views':{}});data=(r/p).read_bytes();row['current']={'sha256':sha(data),'encoding':'utf8'}
 for target,ref in packet['viewCommits'].items():
  try:before=blob(p,ref)
  except subprocess.CalledProcessError:continue
  view=row['views'].setdefault(target,{'sha256':sha(before)})
  assert view['sha256']==sha(before)
  if sha(before)!=sha(data):view['source']=before.decode()
 packet['files'][p]=row
packet['files']=dict(sorted(packet['files'].items()));data=gzip.compress((json.dumps(packet,ensure_ascii=False,separators=(',',':'))+'\n').encode(),mtime=0)
(r/'tests/helpers/potion-pointer-ci-union.json.gz').write_bytes(data)
p=r/'tests/helpers/potion-pointer-ci-union.mjs';s=p.read_text();s=re.sub(r"const PACKET_SHA='[a-f0-9]*'", "const PACKET_SHA='"+sha(data)+"'",s);p.write_text(s)
print('bound',len(packet['files']),'inputs; helper closure',len(manifest['files'])+4,'files; packet',sha(data))
