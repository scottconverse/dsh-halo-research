import re,json,hashlib
from pathlib import Path
ROOT=Path(__file__).parent;ROOT.mkdir(parents=True,exist_ok=True)
sources={'q6':Path('C:/Users/scott/Documents/Codex/2026-10-15/gufo-install/gufo.stderr.log'),'q4':Path('C:/Users/scott/AppData/Local/Gufo/stderr.log')}
result={}
for label,p in sources.items():
    b=p.read_bytes();(ROOT/(label+'.log.snapshot')).write_bytes(b)
    lines=b.decode('utf8',errors='replace').splitlines();completed=[];generation=[]
    for i,line in enumerate(lines,1):
        fields=dict(re.findall(r'(\w+)=([^\s]+)',line));fields['line']=i;fields['time']=line[:19]
        if fields.get('event')=='completed':
            completed.append(fields)
            if fields.get('method')=='POST' and fields.get('path')=='/v1/chat/completions':generation.append(fields)
    main=[r for r in generation if int(r.get('prompt_tokens',0))>1000]
    hits=[r for r in main if int(r.get('cached_tokens',0))>0]
    followups=hits # Identified cached continuations, not every possible request called a followup.
    denominator=sum(int(r['prompt_tokens']) for r in hits);cached=sum(int(r['cached_tokens']) for r in hits)
    rss=[int(r['rss_mib']) for r in completed if 'rss_mib' in r]
    result[label]={'source_path':str(p),'source_sha256':hashlib.sha256(b).hexdigest(),'lines':len(lines),'first_log_time':lines[0][:19] if lines else None,'last_log_time':lines[-1][:19] if lines else None,'generation_requests':len(generation),'main_requests':len(main),'small_title_like_requests':len(generation)-len(main),'cache_hits_main':len(hits),'hit_request_cached_fraction':cached/denominator if denominator else None,'main_requests_total_prompt':sum(int(r['prompt_tokens']) for r in main),'main_requests_total_cached':sum(int(r.get('cached_tokens',0)) for r in main),'rss_completed_min_mib':min(rss) if rss else None,'rss_completed_max_mib':max(rss) if rss else None,'last_completed_rss_mib':rss[-1] if rss else None,'snapshot_max_bytes':max([int(r.get('cache_snapshot_bytes',0)) for r in generation],default=0),'warning_error_or_capacity_lines':[{'line':i,'text':l} for i,l in enumerate(lines,1) if re.search(r'\[(WARN|ERROR|FATAL)\]|byte_capacity|snapshot.*skip|cache.*evict',l,re.I)],'generation':generation}
(ROOT/'cache-evidence.json').write_text(json.dumps(result,indent=2),encoding='utf8')
for label,r in result.items():print(label,json.dumps({k:v for k,v in r.items() if k not in ['generation','source_path']},indent=2))
for label,r in result.items():
    print(label,'requests')
    for req in r['generation']:
        print(req['time'],req.get('request'),req.get('prompt_tokens'),req.get('cached_tokens'),req.get('cache'),req.get('cache_miss_reason'),req.get('ttft_ms'),req.get('rss_mib'))
