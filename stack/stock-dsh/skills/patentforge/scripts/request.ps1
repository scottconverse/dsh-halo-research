param([ValidateSet('GET','POST','PUT','DELETE')][string]$Method='GET',[Parameter(Mandatory)][string]$Path,[string]$Body)
$ErrorActionPreference='Stop'
if($Path -notmatch '^[A-Za-z0-9][A-Za-z0-9_/?=&.%-]*$' -or $Path.Contains('..')){throw 'Expected a relative PatentForge API path'}
$config=Get-Content -LiteralPath "$env:USERPROFILE/.dsh-stock/tools/patentforge/config/dsh-connection.private.json" -Raw|ConvertFrom-Json
$params=@{Uri=('http://127.0.0.1:4320/api/'+$Path);Method=$Method;Headers=@{Authorization=('Bearer '+$config.token)};TimeoutSec=120}
if($PSBoundParameters.ContainsKey('Body')){$null=$Body|ConvertFrom-Json;$params.Body=$Body;$params.ContentType='application/json'}
Invoke-RestMethod @params | ConvertTo-Json -Depth 30
