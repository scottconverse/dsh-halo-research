import copy, json
from pathlib import Path
root=Path(__file__).parent
cases=[
 ([], []),
 ([{'id':'a','v':1}], [{'id':'a','v':1}]),
 ([{'id':'a','v':1},{'id':'b','v':2},{'id':'a','v':3}], [{'id':'b','v':2},{'id':'a','v':3}]),
 ([{'id':'a','v':1},{'id':'a','v':2},{'id':'a','v':3}], [{'id':'a','v':3}]),
 ([{'id':1},{'id':'1'},{'id':None},{'id':1,'v':2}], [{'id':'1'},{'id':None},{'id':1,'v':2}]),
 ([{'id':'a'},{'id':'b'},{'id':'c'},{'id':'b','v':4}], [{'id':'a'},{'id':'c'},{'id':'b','v':4}]),
]
summary=[]
for host in ['web','desktop']:
 native=json.loads((root/host/'native-result.json').read_text())
 assert not native['result']['isError']
 pwsh=native['result']['value']['native']['value']
 assert pwsh['exitCode']==0 and not pwsh['timedOut'] and not pwsh['aborted']
 receipt=json.loads(pwsh['stdout']['text'])
 assert receipt['effort']=='low' and receipt['effort_source']=='model-default'
 assert receipt['max_tokens']==65536 and receipt['max_tokens_source']=='model-default'
 code=receipt['text']
 (root/host/'solution.py').write_text(code+'\n')
 namespace={}
 exec(compile(code, str(root/host/'solution.py'),'exec'),namespace)
 for rows,expected in cases:
  before=copy.deepcopy(rows)
  actual=namespace['latest_by_id'](rows)
  assert actual==expected,(host,rows,actual,expected)
  assert rows==before, 'Input mutated'
  assert actual is not rows, 'Input list returned'
 summary.append({k:v for k,v in {'host':host,'cases_passed':len(cases),'sessionId':native['sessionId'],'native_wall_ms':native['nativeWallMs'],**{k:v for k,v in receipt.items() if k!='text'}}.items()})
(root/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
