$ErrorActionPreference='Stop'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Control-DSH.ps1'),[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'Launcher parsing failed'}
$functionAst=$ast.FindAll({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-OwnedProcess'},$true)[0]
# Exercise only the actual ownership function. Never source/start the launcher
# or query/terminate a real process in this regression test.
Invoke-Expression $functionAst.Extent.Text
$runtime=Join-Path ([IO.Path]::GetTempPath()) ('dsh-owner-'+[guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Path $runtime | Out-Null
$script:actual=[pscustomobject]@{ExecutablePath='C:\DSH Test\node.exe';CreationDate=[datetime]'2026-11-02T17:51:01.245796Z';CommandLine='"C:\DSH Test\node.exe" "C:\DSH Test\web.mjs"'}
function Get-CimInstance { param($ClassName,$Filter) return $script:actual }
try {
    @{pid=1234;exe=$script:actual.ExecutablePath;startedAt=$script:actual.CreationDate.ToUniversalTime().ToString('o');commandLine=$script:actual.CommandLine} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtime 'web.json')
    if(-not (Get-OwnedProcess 'web')){throw 'Exact owned identity was rejected'}
    foreach($field in @('ExecutablePath','CreationDate','CommandLine')) {
        $before=$script:actual.$field
        if($field -eq 'CreationDate'){$script:actual.$field=$before.AddSeconds(1)}else{$script:actual.$field='different'}
        $rejected=$false
        try {Get-OwnedProcess 'web' | Out-Null}catch{if($_.Exception.Message -like 'Process identity changed*'){$rejected=$true}else{throw}}
        if(-not $rejected){throw "Mismatched $field accepted"}
        $script:actual.$field=$before
    }
    $script:actual=$null
    if(Get-OwnedProcess 'web'){throw 'Exited PID accepted'}
    if(-not (Test-Path -LiteralPath (Join-Path $runtime 'web.json'))){throw 'Recovery receipt was removed'}
    Write-Output 'PASS: exact identity, changed executable/start/command, exited PID and receipt retention.'
} finally {
    # The exact test-owned generated directory is the sole deletion target.
    if([IO.Path]::GetFullPath($runtime).StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()),[StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $runtime) -like 'dsh-owner-*'){Remove-Item -LiteralPath $runtime -Recurse -Force}
}
