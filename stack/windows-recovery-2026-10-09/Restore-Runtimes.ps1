$ErrorActionPreference = 'Stop'
$pairs = @(
  @{ Source='C:\Users\scott\scoop\apps\nodejs-lts\current'; Target='C:\Program Files\nodejs'; Exe='node.exe' },
  @{ Source='C:\Users\scott\scoop\apps\pwsh\current'; Target='C:\Program Files\PowerShell\7'; Exe='pwsh.exe' }
)
foreach ($pair in $pairs) {
  if (Test-Path -LiteralPath (Join-Path $pair.Target $pair.Exe)) { throw "Runtime already present; refusing overwrite: $($pair.Target)" }
  if (-not (Test-Path -LiteralPath (Join-Path $pair.Source $pair.Exe))) { throw "Source runtime missing: $($pair.Source)" }
  New-Item -ItemType Directory -Path $pair.Target -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $pair.Source -Force) { Copy-Item -LiteralPath $item.FullName -Destination $pair.Target -Recurse -Force }
  $sourceHash = (Get-FileHash -LiteralPath (Join-Path $pair.Source $pair.Exe)).Hash
  $targetHash = (Get-FileHash -LiteralPath (Join-Path $pair.Target $pair.Exe)).Hash
  if ($sourceHash -ne $targetHash) { throw 'Copied runtime hash mismatch' }
  Write-Output "Restored $($pair.Target) with matching executable SHA256"
}
& 'C:\Program Files\nodejs\node.exe' --version
& 'C:\Program Files\PowerShell\7\pwsh.exe' -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
