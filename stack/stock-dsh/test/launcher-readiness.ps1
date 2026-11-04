$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\..\Web-Readiness.ps1"
$fixture = Join-Path ([IO.Path]::GetTempPath()) 'dsh-launcher-readiness-fixture'
New-Item -ItemType Directory -Force "$fixture\logs" | Out-Null
Set-Content "$fixture\logs\dsh.stdout.log" 'http://127.0.0.1:3080/?token=synthetic-test'
$script:mode = 'ok'
$script:calls = 0
function Invoke-WebRequest {
    param($Uri, [switch]$NoProxy, [switch]$UseBasicParsing, [switch]$SkipHttpErrorCheck, $TimeoutSec, $SessionVariable, $WebSession)
    $script:calls++
    if (-not $NoProxy) { throw 'Loopback must bypass proxy' }
    if ($SessionVariable) {
        Set-Variable -Name $SessionVariable -Value 'synthetic-session' -Scope 1
        $html = '<html><script src="plugins/??example.js&amp;rev=1"></script><script type="module" crossorigin src="./assets/main.js"></script></html>'
        if ($script:mode -eq 'external') { $html = $html.Replace('./assets/main.js', 'https://example.com/main.js') }
        return @{ StatusCode = $(if ($script:mode -eq 'unauthorized') {401} else {200}); Content = $html }
    }
    if ($Uri -ne 'http://127.0.0.1:3080/assets/main.js' -or $WebSession -ne 'synthetic-session') { throw 'Wrong application script or missing authenticated session' }
    return @{ StatusCode = $(if ($script:mode -eq 'missing') {404} else {200}); RawContentLength = 20; Content = 'export const app=1;' }
}
foreach ($case in @('ok','unauthorized','external','missing')) {
    $script:mode = $case; $script:calls = 0; $failed = $false
    try { $result = Get-DshWebReadiness $fixture } catch { $failed = $true }
    if (($case -eq 'ok') -eq $failed) { throw "Unexpected readiness result: $case" }
    if ($case -in @('unauthorized','external') -and $script:calls -ne 1) { throw 'Unsafe follow-up request' }
    Write-Output "PASS $case"
}
