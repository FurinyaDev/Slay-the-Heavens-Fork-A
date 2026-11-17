import subprocess,re,json,gzip,hashlib
from pathlib import Path
p=Path.cwd()
base='d2a8fa6d3d0beba9774b07083589a867497efba2'
if subprocess.run(['git','cat-file','-e',base],stderr=subprocess.DEVNULL).returncode:
 base='b073f3af91fdde67fe19ffbd84f0e0e936a635eb'
assert subprocess.check_output(['git','rev-parse',base+'^{tree}']).decode().strip()=='bfae02a08cefe0f87aab9172a675bd87bc50b749'
def old(f):return subprocess.check_output(['git','-C',str(p),'show',base+':'+f])
f='tests/ci-complete-calibration.test.mjs'
a,b=old(f).decode(),(p/f).read_text()
names=lambda s:re.findall(r"^test\((['\"])(.*?)\1",s,re.M)
assert names(a)==names(b),'Original test names/order changed'
assert a[a.index("\ntest(") :]==b[b.index("\ntest(") :],'Original test bodies changed'
methods=lambda s:{x:len(re.findall(r'assert\.'+x+r'\s*\(',s)) for x in set(re.findall(r'assert\.(\w+)\s*\(',s))}
assert methods(a)==methods(b),(methods(a),methods(b))
print('Original',len(names(a)),'top-level test names/order and assertion-method counts retained')
packet='tests/helpers/potion-pointer-ci-union.json.gz'
x=json.loads(gzip.decompress(old(packet)));y=json.loads(gzip.decompress((p/packet).read_bytes()))
assert x['files'].keys()==y['files'].keys()
for k,v in x['files'].items():
 assert v['views'].keys()==y['files'][k]['views'].keys(),k
 for target,view in v['views'].items():
  successor=y['files'][k]['views'][target]
  assert view['sha256']==successor['sha256'],k
  if 'source' in view:assert view['source']==successor['source'],k
  elif 'source' in successor:assert hashlib.sha256(successor['source'].encode()).hexdigest()==view['sha256'],k
 if k!=f:assert v==y['files'][k],k
print('All parent views and other',len(x['files'])-1,'whole rows unchanged')
for q in ['src','data','config','tests/integrated-ci-source.cases.mjs','tests/release-selection-map-source.test.mjs']:
 assert not subprocess.check_output(['git','-C',str(p),'diff',base,'--',q]),q
print('Prior selection/integrated and product source/data/config unchanged')
