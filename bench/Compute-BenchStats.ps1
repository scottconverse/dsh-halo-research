<#
  Compute-BenchStats.ps1 — aggregate accepted benchmark CSVs into per-backend
  mean / sd / cv, and report the backend comparison in units of measured noise.

  Only ACCEPTED runs are included. The discarded runs (prompt-cache-contaminated
  and contended) are excluded by label, deliberately and visibly.
#>
param(
    [string]$Dir = 'C:\Users\scott\Desktop\Code\dsh-halo-research\evidence'
)

$ACCEPTED = '^(vulkan-2\.29\.1-clean|vulkan-rep\d+|rocm-2\.29\.1|rocm-rep\d+)$'

$rows = Get-ChildItem $Dir -Filter 'bench-*.csv' |
        ForEach-Object { Import-Csv $_.FullName } |
        Where-Object { $_.Label -match $ACCEPTED -and $_.PromptKb -in '8','32' }

function Stat($values) {
    $v = @($values | ForEach-Object { [double]$_ })
    if ($v.Count -eq 0) { return $null }
    $m = ($v | Measure-Object -Average).Average
    $sd = if ($v.Count -gt 1) {
        [math]::Sqrt((($v | ForEach-Object { [math]::Pow($_ - $m, 2) } | Measure-Object -Sum).Sum) / ($v.Count - 1))
    } else { 0 }
    [pscustomobject]@{ N = $v.Count; Mean = $m; Sd = $sd; Cv = if ($m) { 100 * $sd / $m } else { 0 } }
}

function Backend($label) { if ($label -like 'rocm*') { 'ROCm' } else { 'Vulkan' } }

Write-Host "=== Per-rung statistics (accepted runs only) ==="
$summary = @{}
foreach ($kb in '8','32') {
    foreach ($be in 'Vulkan','ROCm') {
        $g = $rows | Where-Object { $_.PromptKb -eq $kb -and (Backend $_.Label) -eq $be }
        if (-not $g) { continue }
        foreach ($metric in 'TtftSec','DecodeTokPerS') {
            $s = Stat ($g | ForEach-Object { $_.$metric })
            $summary["$be|$kb|$metric"] = $s
            "{0,-6} {1,3} KB  {2,-14} n={3}  mean={4,8:N3}  sd={5,6:N3}  cv={6,5:N2}%" -f `
                $be, $kb, $metric, $s.N, $s.Mean, $s.Sd, $s.Cv
        }
    }
}

Write-Host "`n=== Marginal prefill 8 -> 32 KB, per run ==="
$mp = @{ Vulkan = @(); ROCm = @() }
foreach ($r in ($rows | Group-Object Label)) {
    $a = $r.Group | Where-Object { $_.PromptKb -eq '8' }
    $b = $r.Group | Where-Object { $_.PromptKb -eq '32' }
    if ($a -and $b) {
        $val = ([double]$b.PromptTokens - [double]$a.PromptTokens) / ([double]$b.TtftSec - [double]$a.TtftSec)
        $mp[(Backend $r.Name)] += $val
        "  {0,-22} {1,7:N1} tok/s" -f $r.Name, $val
    }
}
foreach ($be in 'Vulkan','ROCm') {
    if ($mp[$be].Count) {
        $s = Stat $mp[$be]
        "  ==> {0,-6} n={1}  mean={2,7:N1}  sd={3,5:N2}  cv={4,5:N2}%" -f $be, $s.N, $s.Mean, $s.Sd, $s.Cv
    }
}

Write-Host "`n=== Comparison, expressed in units of measured noise ==="
function Show-Comparison($name, $v, $r, $higherIsBetter) {
    if (-not $v -or -not $r) { return }
    $diff = $r.Mean - $v.Mean
    $pooled = [math]::Sqrt((($v.Sd * $v.Sd) + ($r.Sd * $r.Sd)) / 2)
    $sigma = if ($pooled -gt 0) { [math]::Abs($diff) / $pooled } else { [double]::PositiveInfinity }
    $ratio = if ($v.Mean) { $r.Mean / $v.Mean } else { 0 }
    $winner = if ($higherIsBetter) { if ($r.Mean -gt $v.Mean) { 'ROCm' } else { 'Vulkan' } }
              else                 { if ($r.Mean -lt $v.Mean) { 'ROCm' } else { 'Vulkan' } }
    $verdict = if ($sigma -ge 3) { "DECISIVE ($winner)" } elseif ($sigma -ge 2) { "suggestive ($winner)" } else { 'WITHIN NOISE' }
    "{0,-28} Vulkan={1,8:N2}  ROCm={2,8:N2}  ratio={3,5:N2}x  separation={4,6:N1} sd  -> {5}" -f `
        $name, $v.Mean, $r.Mean, $ratio, $sigma, $verdict
}
foreach ($kb in '8','32') {
    Show-Comparison "$kb KB  TTFT (lower better)"   $summary["Vulkan|$kb|TtftSec"]       $summary["ROCm|$kb|TtftSec"]       $false
    Show-Comparison "$kb KB  decode (higher better)" $summary["Vulkan|$kb|DecodeTokPerS"] $summary["ROCm|$kb|DecodeTokPerS"] $true
}
if ($mp.Vulkan.Count -and $mp.ROCm.Count) {
    Show-Comparison "marginal prefill 8->32 KB" (Stat $mp.Vulkan) (Stat $mp.ROCm) $true
}

