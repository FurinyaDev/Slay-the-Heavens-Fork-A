import subprocess,json,gzip,hashlib,re
from pathlib import Path
p=Path.cwd();base='43be61802b62d9783e801ab672ecd5d52afec3a6'
if subprocess.run(['git','cat-file','-e',base],stderr=subprocess.DEVNULL).returncode:base='5aea4918d2e250ea3bc9ff56135a8be0ffce7f76'
assert subprocess.check_output(['git','rev-parse',base+'^{tree}']).decode().strip()=='c7cdcc312f2addd64f1d32e85720c699be44f489'
def old(f,ref=base):return subprocess.check_output(['git','show',ref+':'+f])
f='tests/ci-complete-calibration.test.mjs';a=old(f).decode();b=Path(f).read_text()
names=lambda x:re.findall(r"^test\((['\"])(.*?)\1",x,re.M)
assert names(a)==names(b) and len(names(a))==78
# Exactly three typed fault-injection rewrites; all other original test-body bytes unchanged.
replacements=[("nativeCloseoutRead(path,encoding)+(path===added?'\\n':'')","path===added?nativeCloseoutRead(path,encoding)+'\\n':nativeCloseoutRead(path,encoding)"),("liveDiskReadFileSync(p,e)+(p===path?'\\n':'')","p===path?liveDiskReadFileSync(p,e)+'\\n':liveDiskReadFileSync(p,e)")]
expected=a[a.index('\ntest('):]
for x,y in replacements:expected=expected.replace(x,y)
assert expected==b[b.index('\ntest('):]
packet='tests/helpers/potion-pointer-ci-union.json.gz';x=json.loads(gzip.decompress(old(packet)));y=json.loads(gzip.decompress(Path(packet).read_bytes()))
added=['tests/helpers/'+n+'.mjs' for n in ['joint-ui-ci-source-inverse','closeout-ci-source','run-hud-ci-source','sts-style-ci-source','menu-red-ci-source']]
assert set(y['files'])==set(x['files'])|set(added) and len(y['files'])==192
for k,v in x['files'].items():
 q=y['files'][k];assert v['views'].keys()==q['views'].keys()
 for target,view in v['views'].items():
  assert view['sha256']==q['views'][target]['sha256']
  if 'source' in view:assert view['source']==q['views'][target]['source']
 if k not in [f,'tests/helpers/integrated-ci-source.mjs','tests/integrated-ci-source.cases.mjs']:assert v==q,k
for k in added:
 for target,ref in y['viewCommits'].items():
  raw=old(k,ref);view=y['files'][k]['views'][target]
  assert hashlib.sha256(raw).hexdigest()==view['sha256']
  assert view['source'].encode()==raw
prior=Path('tests/helpers/potion-pointer-ci-before-readers.json.gz').read_bytes();assert prior==old(packet)
cases='tests/integrated-ci-source.cases.mjs'
assert Path(cases).read_text()==old(cases).decode().replace("['tests/helpers/run-hud-ci-source.mjs','integration']","['tests/helpers/run-hud-ci-source.mjs','post697']")
for q in ['src','data','config','tests/release-selection-map-source.test.mjs']:
 assert not subprocess.check_output(['git','diff',base,'--',q])
print('Independent structure PASS: 78 original names/expected assertions; only 3 typed fault injections differ in bodies; exact prior packet; 184 other original rows; exact five added dual-parent complete sources; 192 authenticated inputs; one exact run-HUD rejecting-owner label; no product/selection change.')
