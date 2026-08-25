<#
  Assemble-Report.ps1 — concatenate the report parts into one deliverable in
  the order the research directive requires.
#>
param(
    [string]$Root = 'C:\Users\scott\Desktop\Code\dsh-halo-research',
    [string]$Out  = 'C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report.md'
)

$order = @(
    'REPORT.md',        # clean-room decl, exec summary, what's possible, versions
    'REPORT-part2.md',  # DSH current state, inventory, Windows audit
    'REPORT-part3.md',  # hardware, memory architecture, ROCm state
    'REPORT-part10.md', # backend benchmark (Vulkan vs ROCm)
    'REPORT-part4.md',  # server comparison, Qwen deep dive, DSH config
    'REPORT-part5.md',  # portfolio, NPU, Windows 11, storage, benchmark arch
    'REPORT-part8.md',  # community + upstream evidence
    'REPORT-part6.md',  # architecture, outstanding tests, risks, decisions, install
    'REPORT-part7.md'   # 40 questions, sources
)

$sb = [System.Text.StringBuilder]::new()
foreach ($f in $order) {
    $p = Join-Path $Root $f
    if (-not (Test-Path $p)) { Write-Warning "missing: $f"; continue }
    [void]$sb.AppendLine((Get-Content $p -Raw -Encoding UTF8))
    [void]$sb.AppendLine()
}
$sb.ToString() | Set-Content -Encoding UTF8 $Out
$lines = (Get-Content $Out).Count
$kb    = [math]::Round((Get-Item $Out).Length/1KB,1)
Write-Host "wrote $Out  ($lines lines, $kb KB)"
