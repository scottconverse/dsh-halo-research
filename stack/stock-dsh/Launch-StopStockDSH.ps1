[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
try {
    & (Join-Path $PSScriptRoot 'Stop-StockDSH.ps1')
} catch {
    $message = $_.Exception.Message -replace '(?i)(token=)[\w-]+', '$1[REDACTED]'
    Add-Content -LiteralPath (Join-Path $PSScriptRoot 'logs\launcher-errors.log') -Value "$(Get-Date -Format o) Stop: $message"
    $shell = New-Object -ComObject WScript.Shell
    $null = $shell.Popup($message, 0, 'DSH Web could not stop safely', 16)
    exit 1
}
