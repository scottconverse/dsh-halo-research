"""Match DSH's YAML 1.2 booleans; YAML 1.1 must not turn Off/on into booleans."""
import re,yaml
for key,values in list(yaml.SafeLoader.yaml_implicit_resolvers.items()):
    yaml.SafeLoader.yaml_implicit_resolvers[key]=[(tag,pattern) for tag,pattern in values if tag!='tag:yaml.org,2002:bool']
yaml.SafeLoader.add_implicit_resolver('tag:yaml.org,2002:bool',re.compile(r'^(?:true|false|True|False|TRUE|FALSE)$'),'tTfF')
