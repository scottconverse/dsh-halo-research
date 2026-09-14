$ErrorActionPreference = 'Stop'
$owned=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -like '*stock-dsh\node_modules\@deepseek-ai\dsh\lib\bin.js*'})
foreach($candidate in $owned){
 $live=Get-CimInstance Win32_Process -Filter "ProcessId=$($candidate.ProcessId)"
 if($live -and $live.CreationDate -eq $candidate.CreationDate -and $live.CommandLine -eq $candidate.CommandLine){ & taskkill.exe /PID $live.ProcessId /T /F | Out-Null }
}
$remaining=@(Get-NetTCPConnection -State Listen -LocalPort 3080 -ErrorAction SilentlyContinue)
if($remaining.Count){throw 'A listener remains on 3080. Inspect its owner before stopping it.'}
Write-Output 'Stock DSH and its Wigolo MCP child processes stopped. LM Studio and its models remain running.'
