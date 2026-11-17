import subprocess,json,gzip,hashlib,pathlib
r=pathlib.Path('.')
def git(p,ref): return subprocess.check_output(['git','show',ref+':'+p])
base='0d379cd3d14b7fdce9ffd790d205b1033589e8d5';parent='ad6fe84dbcc11e28e8a82258f889a6841b46c8c6'
old=json.loads(gzip.decompress(git('tests/helpers/potion-pointer-ci-union.json.gz',base)));new=json.loads(gzip.decompress((r/'tests/helpers/potion-pointer-ci-union.json.gz').read_bytes()))
paths=['tests/mobile-card-release.test.mjs','tests/lua/support/battle_pointer_identity_cases.lua','tests/lua/support/battle_sparse_pointer_cases.lua']
for p in paths: assert (r/p).read_bytes()==git(p,parent),p
assert len(old['files'])==193 and len(new['files'])==195
changed=set(paths+['tests/helpers/copy-integration-source-closure.mjs','tests/helpers/potion-pointer-ci-copy-closure.json'])
for p,row in old['files'].items():
 if p not in changed: assert new['files'][p]==row,p
 assert set(new['files'][p]['views'])==set(row['views']),p
 for target,view in row['views'].items():
  actual=new['files'][p]['views'][target];assert actual['sha256']==view['sha256'],p
  if 'source' in view: assert actual['source']==view['source'],p
  if 'source' in actual: assert hashlib.sha256(actual['source'].encode()).hexdigest()==view['sha256'],p
for p in changed: assert hashlib.sha256((r/p).read_bytes()).hexdigest()==new['files'][p]['current']['sha256'],p
assert (r/'tests/helpers/potion-pointer-ci-before-behavior.json.gz').read_bytes()==git('tests/helpers/potion-pointer-ci-union.json.gz',base)
print('PASS exact 3 original pointer files, 195 current inputs, every inherited parent view, all untouched whole rows, exact prior archive')
