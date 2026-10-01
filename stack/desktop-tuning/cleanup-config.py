from pathlib import Path
import shutil, json, re, yaml
import yaml12
R=Path(r'C:\Users\scott\Documents\Codex\2026-10-01\dsh-windows-study')
D=Path(r'C:\Users\scott\Desktop\Code\dsh-halo-research\stack')
H=Path(r'C:\Users\scott\.dsh-stock')
E=Path(r'C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval')
B=R/'cleanup-backup'; B.mkdir(exist_ok=True)
policy=json.loads((D/'desktop-tuning/model-policy.json').read_text(encoding='utf-8'))
changed=[]
def put(p,text):
    if p.exists():
        b=B/str(p).replace(':','').replace('\\','__').replace('/','__')
        if not b.exists(): shutil.copy2(p,b)
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(text,encoding='utf-8');changed.append(str(p))
# Existing stock lean preset plus stock supervision/history/web plugins.
lean=(D/'stock-dsh/local-lean-preset/agent.cordis.yml').read_text(encoding='utf-8-sig')
full=(H/'.agent-presets/fast-first/agent.cordis.yml').read_text(encoding='utf-8-sig')
if '    # Fork omits' not in full:
    full=(B/str(H/'.agent-presets/fast-first/agent.cordis.yml').replace(':','').replace('\\','__').replace('/','__')).read_text(encoding='utf-8-sig')
persona='Implement and verify directly first. Delegate once to the configured 27B fallback only after an observed persistent failed check, incomplete implementation, or repeated tool errors. Send the factual failure and independently verify its result. Supervise with list_agents, messaging, and session history/trace tools. Use stock web_search and web_fetch first; use the desktop-optional-tools skill for Wigolo CLI only when needed. Do not automatically invoke pairing-team. Exact counts come from code.'
lean=lean.replace('Keep tool output concise. Finish once the requested outcome is verified.',persona+' Keep tool output concise. Finish once the requested outcome is verified.')
lean=lean.replace('thresholdRatio: 0.8','thresholdRatio: 0.7')
start=full.index('- id: delegation\n');end=full.index('    # Fork omits',start)
delegation=full[start:end].replace('maxTokens: 16384','maxTokens: 24576')
history=full[full.index('- id: history-tools\n'):full.index('# LSP consumer')]
web="\n- id: tool-web\n  name: '@deepseek-ai/dsh-tool-web'\n  config:\n    fetch: true\n    searchTimeoutMs: 60000\n"
lean+='\n'+delegation+'\n'+history+web
for base in [H/'.agent-presets/fast-first',D/'stock-dsh/fast-first-preset']:
    put(base/'agent.cordis.yml',lean)
    put(base/'tool-catalog.mjs',(D/'stock-dsh/local-lean-preset/tool-catalog.mjs').read_text(encoding='utf-8-sig'))
    put(base/'preset.yml','name: Fast-first lean local\ndescription: Lean coding, basic web, stock fallback supervision; Wigolo on demand.\norder: 0\n')
for p in [H/'settings.yaml',D/'stock-dsh/settings.yaml']:
    data=yaml.safe_load(p.read_text(encoding='utf-8-sig'));f=data['llm-pi-ai']['providers']['web-fallback']
    f['defaultMaxTokens']=policy['webFallback']['maxTokens']
    for m in f['models']:m['maxTokens']=policy['webFallback']['maxTokens']
    put(p,yaml.safe_dump(data,sort_keys=False,allow_unicode=True))
for p in [H/'cordis.patch.yml',D/'stock-dsh/cordis.patch.yml']:
    if p.exists():
        t=p.read_text(encoding='utf-8-sig');t=re.sub(r'(- id: mcp-wigolo\n)(?!\s+disabled:)',r'\1    disabled: true\n',t)
        put(p,t)
p=D/'stock-dsh/Start-StockDSH.ps1';t=p.read_text(encoding='utf-8-sig')
t=t.replace('$wigoloProcess = Wait-ForWigoloMcpChild\nWrite-StackLog "Verified DSH-owned Wigolo MCP process (PID $($wigoloProcess.ProcessId))."',"Write-StackLog 'Wigolo is on demand; no eager MCP process required.'")
t=t.replace('if (-not (Test-Path -LiteralPath $wigoloEntry -PathType Leaf)) {\n    throw "Wigolo\'s MCP entry point is missing: $wigoloEntry"\n}',"# Optional Wigolo CLI is checked only when invoked.")
put(p,t)
# Keep explicit Off through launcher refresh; never touch residency.
for p in [D/'desktop-tuning/Select-Resident-Desktop-Model.ps1',E/'Select-Resident-Desktop-Model.ps1']:
    put(p,p.read_text(encoding='utf-8-sig').replace('reasoningEffort: medium','reasoningEffort: off'))
# Hide duplicate raw Q6 and Web-only aliases. Preserve tuned Q4/Q6 rows.
for p in [D/'desktop-tuning/Refresh-Desktop-Model-Catalog.ps1',E/'Refresh-Desktop-Model-Catalog.ps1']:
    t=p.read_text(encoding='utf-8-sig').replace("$hiddenLmKeys = @('qwen3.8-27b-km', 'halo/qwen3.8-27b', 'unsloth/qwen3.8-27b')","$hiddenLmKeys = @('qwen3.8-27b-km', 'halo/qwen3.8-27b', 'unsloth/qwen3.8-27b', 'qwen/qwen3.8-27b', 'halo/qwen3.8-27b-q6-fast', 'halo/qwen3.6-35b-a3b-q6')")
    put(p,t)
p=E/'home/profiles/desktop/cordis.patch.yml';t=p.read_text(encoding='utf-8-sig')
t=re.sub(r'(?m)^          - id: "qwen/qwen3.8-27b"\n(?:^            .*\n)*','',t)
put(p,t)
# Never offer temporary study aliases after a catalog refresh.
for p in [D/'desktop-tuning/Refresh-Desktop-Model-Catalog.ps1',E/'Refresh-Desktop-Model-Catalog.ps1']:
    put(p,p.read_text(encoding='utf-8-sig').replace('$_.modelKey -notin $tunedLmKeys', "$_.modelKey -notlike 'study/*' -and $_.modelKey -notin $tunedLmKeys"))
p=D/'stock-dsh/Start-StockDSH.ps1'
put(p,p.read_text(encoding='utf-8-sig').replace('DSH, its Wigolo MCP child, and Mission Control are ready.', 'DSH and Mission Control are ready; Wigolo is available on demand.'))
# Reusable cleanup recipe for subsequent catalog refreshes.
put(D/'desktop-tuning/cleanup-config.py',Path(__file__).read_text(encoding='utf-8-sig'))
put(D/'desktop-tuning/yaml12.py',(R/'yaml12.py').read_text(encoding='utf-8-sig'))
(R/'cleanup-changes.json').write_text(json.dumps({'backup':str(B),'changed':changed},indent=2))
print(json.dumps({'changed':len(changed),'backup':str(B)}))
