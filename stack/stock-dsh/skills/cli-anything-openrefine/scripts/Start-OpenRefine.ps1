$ErrorActionPreference = 'Stop'
$uri = 'http://127.0.0.1:3333/command/core/get-version'
try {
    $version = Invoke-RestMethod $uri -TimeoutSec 2
    if (-not $version.version) { throw 'Port 3333 returned an unexpected response' }
    $version | ConvertTo-Json -Compress
    return
} catch {
    $socket = [Net.Sockets.TcpClient]::new()
    try {
        $socket.Connect('127.0.0.1', 3333)
        throw 'Port 3333 is occupied but OpenRefine is not ready. Leave it intact and inspect the owner/logs.'
    } catch [Net.Sockets.SocketException] {
        # No listener: start the isolated installation below.
    } finally { $socket.Dispose() }
}
$app = Join-Path $env:USERPROFILE '.dsh-stock\tools\openrefine-3.10.1\openrefine-3.10.1'
$state = Join-Path $env:USERPROFILE '.dsh-stock\tools\openrefine-service'
$java = Join-Path $app 'server\target\jre\bin\java.exe'
if (-not (Test-Path -LiteralPath $java)) { throw "Missing bundled Java: $java" }
New-Item -ItemType Directory -Force $state, "$state\data" | Out-Null
$arguments = @('-Xms256M', '-Xmx1400M', '-Drefine.headless=true', '-Drefine.interface=127.0.0.1', '-Drefine.host=127.0.0.1', '-Drefine.port=3333', '-Drefine.webapp=webapp', "-Drefine.data_dir=$state\data", '-cp', 'server\target\lib\*', 'com.google.refine.Refine')
$process = Start-Process -FilePath $java -ArgumentList ($arguments | ForEach-Object { '"' + $_ + '"' }) -WorkingDirectory $app -WindowStyle Hidden -PassThru -RedirectStandardOutput "$state\stdout.log" -RedirectStandardError "$state\stderr.log"
@{pid=$process.Id; executable=$java; startedAt=$process.StartTime.ToUniversalTime().ToString('o'); url='http://127.0.0.1:3333'; data="$state\data"} | ConvertTo-Json | Set-Content "$state\owner.json"
for ($attempt=0; $attempt -lt 30; $attempt++) {
    if ($process.HasExited) { throw "OpenRefine exited. Read $state\stderr.log" }
    try {
        $version = Invoke-RestMethod $uri -TimeoutSec 2
        if ($version.version) { $version | ConvertTo-Json -Compress; return }
    } catch { }
    Start-Sleep -Seconds 1
}
throw "OpenRefine is still starting. Inspect $state before retrying; do not spawn another copy."
