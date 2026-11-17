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
paths.update('tests/helpers/'+name+'.mjs' for name in ['joint-ui-ci-source-inverse','closeout-ci-source','run-hud-ci-source','sts-style-ci-source','menu-red-ci-source'])
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
before=blob('7d02a6ae3be107730b7c1c128720e22c8431cbbe','tests/helpers/potion-pointer-ci-union.json.gz')
assert hashlib.sha256(before).hexdigest()=='ed0dd1a847de736030747f4b1b2a051e42930830a885046ffc96c11270098ccb'
(r/'tests/helpers/potion-pointer-ci-before-selection.json.gz').write_bytes(before)
packet['predecessorCommit']='7d02a6ae3be107730b7c1c128720e22c8431cbbe'
packet['predecessorPacketSha256']=hashlib.sha256(before).hexdigest()
packet['scope']='selection historical consumer continuation; other consumers and pointer additions pending'
integratedBefore=blob('324d2a2797201725cb104097567d69da681b84a8','tests/helpers/potion-pointer-ci-union.json.gz')
assert hashlib.sha256(integratedBefore).hexdigest()=='4e21ceac3bdf6bf34a7f4c3d9426c8b26a3c6f7eee600b3688f79154fcc0b22b'
(r/'tests/helpers/potion-pointer-ci-before-integrated.json.gz').write_bytes(integratedBefore)
packet['scope']='integrated historical consumer continuation; pointer added assertions and calibration pending'
packet['integratedPredecessorCommit']='324d2a2797201725cb104097567d69da681b84a8'
packet['integratedPredecessorSha256']='4e21ceac3bdf6bf34a7f4c3d9426c8b26a3c6f7eee600b3688f79154fcc0b22b'
calibrationBefore=blob('b073f3af91fdde67fe19ffbd84f0e0e936a635eb','tests/helpers/potion-pointer-ci-union.json.gz')
assert hashlib.sha256(calibrationBefore).hexdigest()=='7b049aac614a17f37f3c272e11c45df127c43f83d5109567018ea548ac921081'
(r/'tests/helpers/potion-pointer-ci-before-calibration.json.gz').write_bytes(calibrationBefore)
assert subprocess.check_output(['git','rev-parse','b073f3af91fdde67fe19ffbd84f0e0e936a635eb^{tree}']).decode().strip()=='bfae02a08cefe0f87aab9172a675bd87bc50b749'
# Remote d2a8fa6 and local b073f3a have the same reviewed tree.
packet['calibrationPredecessorCommit']='d2a8fa6d3d0beba9774b07083589a867497efba2'
packet['calibrationPredecessorSha256']=hashlib.sha256(calibrationBefore).hexdigest()
packet['scope']='calibration historical consumer continuation; pointer assertions and isolated CI-copy closure pending'
readersBefore=blob('5aea4918d2e250ea3bc9ff56135a8be0ffce7f76','tests/helpers/potion-pointer-ci-union.json.gz')
assert hashlib.sha256(readersBefore).hexdigest()=='2550d7de0c1b491e342b2a50d453fd4553593f524da152181da6cff0fcdd0435'
assert subprocess.check_output(['git','rev-parse','5aea4918d2e250ea3bc9ff56135a8be0ffce7f76^{tree}']).decode().strip()=='c7cdcc312f2addd64f1d32e85720c699be44f489'
(r/'tests/helpers/potion-pointer-ci-before-readers.json.gz').write_bytes(readersBefore)
packet['readersPredecessorCommit']='43be61802b62d9783e801ab672ecd5d52afec3a6'
packet['readersPredecessorSha256']=hashlib.sha256(readersBefore).hexdigest()
packet['scope']='explicit current/historical inventory readers; pointer assertions and isolated CI-copy closure pending'
b=gzip.compress((json.dumps(packet,ensure_ascii=False,separators=(',',':'))+'\n').encode(),mtime=0)
(r/'tests/helpers/potion-pointer-ci-union.json.gz').write_bytes(b)
p=r/'tests/helpers/potion-pointer-ci-union.mjs';s=p.read_text();s=re.sub(r"const PACKET_SHA='[a-f0-9]*'", "const PACKET_SHA='"+hashlib.sha256(b).hexdigest()+"'",s);p.write_text(s)
print('bound',len(rows),'paths',len(b),'bytes')
