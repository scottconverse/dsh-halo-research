"""One-time migration of Scott's Desktop picker, with backed-up launcher sources.

Run on this existing layout only. Does not delete weights or load/unload models.
"""
from pathlib import Path
import json, re, shutil, urllib.request, yaml

root = Path(r'C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval')
home = root / 'home'
backup = Path(r'C:\Users\scott\Documents\Codex\2026-09-27\desktop-picker-audit\before')
backup.mkdir(exist_ok=False)
profile_path = home / 'profiles/desktop/cordis.patch.yml'
package_path = home / 'profiles/desktop/package.json'
refresh = root / 'Refresh-Desktop-Model-Catalog.ps1'
selector = root / 'Select-Resident-Desktop-Model.ps1'
for p in [profile_path, package_path, refresh, selector]:
    target = backup / p.relative_to(root)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, target)

class Loader(yaml.SafeLoader):
    pass
Loader.yaml_implicit_resolvers = {k: [(tag, reg) for tag, reg in entries if tag != 'tag:yaml.org,2002:bool'] for k, entries in Loader.yaml_implicit_resolvers.items()}
Loader.add_implicit_resolver('tag:yaml.org,2002:bool', re.compile(r'^(?:true|false)$', re.I), list('tTfF'))
Loader.add_constructor('tag:yaml.org,2002:js', lambda loader, node: loader.construct_scalar(node))

text = profile_path.read_text(encoding='utf-8-sig')
def provider(name, replacement):
    global text
    pattern = rf'(?ms)^      {re.escape(name)}:\n.*?(?=^      [a-zA-Z#]|^- id:|^- insert:|\Z)'
    # Generated comments belong to the provider before them; preserve their boundaries.
    match = re.search(pattern, text)
    if not match:
        raise RuntimeError('Provider block missing: ' + name)
    block = '' if replacement is None else ''.join('      ' + line + '\n' for line in yaml.safe_dump({name: replacement}, sort_keys=False).splitlines())
    text = text[:match.start()] + block + text[match.end():]

data = yaml.load(text, Loader=Loader)
providers = next(x['config']['providers'] for x in data if x.get('id') == 'llm-pi-ai')
cloud_ids = ['deepseek-v4.1-flash:cloud', 'glm-5.3:cloud', 'kimi-k3:cloud', 'minimax-m3:cloud', 'glm-5.3-flash:cloud']
cloud = providers['ollama']
cloud['models'] = [next(m for m in cloud['models'] if m['id'] == id) for id in cloud_ids]
cloud.pop('reasoning', None)
cloud['compat'] = {'thinkingFormat': 'openai', 'supportsReasoningEffort': True}
evidence = {}
for m in cloud['models']:
    req = urllib.request.Request('http://127.0.0.1:11434/api/show', data=json.dumps({'model': m['id']}).encode(), headers={'Content-Type': 'application/json'})
    response = json.load(urllib.request.urlopen(req, timeout=15))
    evidence[m['id']] = {'thinking': response.get('thinking'), 'capabilities': response.get('capabilities')}
    values = response.get('thinking', {}).get('values')
    if values:
        m['reasoningEfforts'] = {('off' if value is False else value): ('none' if value is False else value) for value in values}
    else:
        m['reasoningEfforts'] = False
        m['name'] += ' — provider-default thinking'
    m['input'] = ['text', 'image'] if 'vision' in response.get('capabilities', []) else ['text']
# Replace through the next real provider so the old generated extra rows are gone.
start = text.index('      ollama:\n'); end = text.index('      lmstudio-brain:', start)
text = text[:start] + ''.join('      ' + line + '\n' for line in yaml.safe_dump({'ollama': cloud}, sort_keys=False).splitlines()) + text[end:]
provider('google', None)
qwen_efforts = {'off': 'none', 'low': 'low', 'medium': 'medium', 'xhigh': 'xhigh'}
providers['lmstudio-qwen38']['models'][0]['reasoningEfforts'] = qwen_efforts
provider('lmstudio-qwen38', providers['lmstudio-qwen38'])
library = providers['lmstudio-library']
library['models'] = [m for m in library['models'] if m['id'] not in ['qwen3.8-27b-km', 'halo/qwen3.8-27b', 'unsloth/qwen3.8-27b']]
for m in library['models']:
    if m['id'] in ['halo/qwen3.8-27b-q4km', 'qwen/qwen3.8-27b']:
        m['reasoningEfforts'] = qwen_efforts
    if m['id'] == 'halo/qwen3.8-27b-q4km':
        m['name'] = 'Qwen3.8 27B Q4_K_M — Halo tuned (default)'
        m['maxTokens'] = 16384
    if m['id'] == 'qwen/qwen3.6-35b-a3b':
        m['reasoningEfforts'] = {'off': 'none', 'high': 'high'}
        m['name'] += ' — High means thinking On'
provider('lmstudio-library', library)
text, count = re.subn(r'(?ms)(^- id: agent-default-model\n.*?  config:\n).*?(?=^- id:)', r'\g<1>    provider: lmstudio-library\n    model: halo/qwen3.8-27b-q4km\n    reasoningEffort: medium\n', text, count=1)
assert count == 1
metadata = [
    {'slug': 'claude-opus-5-5', 'display_name': 'Claude Opus 5.5', 'default_reasoning_level': 'medium', 'supported_reasoning_levels': [{'effort': e} for e in ['low', 'medium', 'high', 'xhigh', 'max']]},
    {'slug': 'claude-sonnet-5', 'display_name': 'Claude Sonnet 5', 'default_reasoning_level': 'high', 'supported_reasoning_levels': [{'effort': e} for e in ['low', 'medium', 'high', 'xhigh', 'max']]},
    {'slug': 'claude-haiku-4-5-20251001', 'display_name': 'Claude Haiku 4.5 — no effort control'},
]
extra = {'claudeModels': [m['slug'] for m in metadata], 'claudeMetadata': metadata}
text += ''.join('        ' + line + '\n' for line in yaml.safe_dump(extra, sort_keys=False).splitlines())
text = text.replace('Qwen3 Coder 30B-A3B Q4_K_M - default', 'Qwen3 Coder 30B-A3B Q4_K_M')
yaml.load(text, Loader=Loader)

# Install the versioned launch-time helpers rather than transforming an older copy.
helper_root = Path(__file__).resolve().parent
ps = (helper_root / refresh.name).read_text(encoding='utf-8-sig')
default_script = (helper_root / selector.name).read_text(encoding='utf-8-sig')
pkg = json.loads(package_path.read_text())
pkg['dsh']['profile']['bundles'] = [x for x in pkg['dsh']['profile']['bundles'] if x != 'dsh-xai']
profile_path.write_text(text, encoding='utf-8', newline='\n')
package_path.write_text(json.dumps(pkg, indent=2)+'\n')
refresh.write_text(ps, encoding='utf-8', newline='\n')
selector.write_text(default_script, encoding='utf-8', newline='\n')
(backup.parent/'ollama-thinking-metadata.json').write_text(json.dumps(evidence, indent=2)+'\n')
print('Desktop picker and launch-time curation applied; no weights deleted or models loaded.')
