try {
    & (Join-Path $PSScriptRoot 'Start-StockDSH.ps1')
} catch {
    $message=$_.Exception.Message
    Add-Content -LiteralPath (Join-Path $PSScriptRoot 'logs\launcher-errors.log') -Value "$(Get-Date -Format o) $message"
    $shell=New-Object -ComObject WScript.Shell
    $shell.Popup($message,0,'DSH + Wigolo could not start',16) | Out-Null
    exit 1
}
