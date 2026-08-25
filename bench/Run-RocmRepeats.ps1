<#
  Run-RocmRepeats.ps1 — switch to the ROCm runtime, run N repeats of the short
  rungs, and ALWAYS restore Vulkan afterwards.

  Only the 8 KB and 32 KB rungs are run. The 256 KB rung is deliberately
  excluded: on ROCm it drove the box to 1.55 GB free RAM, and repeating that on
  a live machine is not acceptable.
#>
param(
    [int]   $Repeats = 3,
    [string]$Bench   = 'C:\Users\scott\Desktop\Code\dsh-halo-research\bench\Bench-Local.ps1'
)

$ErrorActionPreference = 'Continue'
$VULKAN = 'llama.cpp-win-x86_64-vulkan-avx2@2.29.1'
$ROCM   = 'llama.cpp-win-x86_64-amd-rocm-avx2@2.29.1'

function Reload-Model {
    param([string]$Runtime)
    & lms unload qwen/qwen3.8-27b 2>&1 | Out-Null
    & lms runtime select $Runtime  2>&1 | Select-Object -Last 1
    & lms load unsloth/qwen3.8-27b --identifier qwen/qwen3.8-27b `
        --context-length 131072 --parallel 1 --ttl 86400 -y 2>&1 | Select-Object -Last 1
}

try {
    Write-Host "=== switching to ROCm ==="
    Reload-Model -Runtime $ROCM

    foreach ($i in 1..$Repeats) {
        Write-Host "---- ROCm repeat $i ----"
        & $Bench -Label "rocm-rep$i" -Model 'qwen/qwen3.8-27b' -PromptKb 8,32 2>&1 |
            Where-Object { $_ -match 'ptok=' }

        # Memory telemetry sampled independently of LM Studio, from the OS.
        $p = Get-Process llama-server -ErrorAction SilentlyContinue
        if ($p) {
            $loc = ((Get-Counter '\GPU Process Memory(*)\Local Usage' -EA SilentlyContinue).CounterSamples |
                    Where-Object { $_.InstanceName -like "*$($p.Id)*" }).CookedValue
            $free = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB
            Write-Host ("     gpu_local={0:N2} GiB  ram_free={1:N2} GB" -f ($loc/1GB), $free)
        }
    }
}
finally {
    Write-Host "=== restoring Vulkan (runs even on failure) ==="
    Reload-Model -Runtime $VULKAN
    & lms runtime ls 2>&1 | Select-String '✓' | ForEach-Object { "  selected: $($_.Line.Trim())" }
    $p = Get-Process llama-server -ErrorAction SilentlyContinue
    if ($p) {
        $loc = ((Get-Counter '\GPU Process Memory(*)\Local Usage' -EA SilentlyContinue).CounterSamples |
                Where-Object { $_.InstanceName -like "*$($p.Id)*" }).CookedValue
        Write-Host ("  restored gpu_local={0:N2} GiB  ram_free={1:N2} GB" -f ($loc/1GB),
                    ((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB))
    }
}
