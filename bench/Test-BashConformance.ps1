<#
  Test-BashConformance.ps1 — run a fixed battery against a candidate `bash`
  and report pass/fail per behaviour.

  Every test avoids PowerShell string interpolation of shell variables by using
  single-quoted PS strings, so a failure is the shell's, not the harness's.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]   $BashPath,
    [string[]]                       $Prefix = @(),   # e.g. @('-e','bash') for wsl.exe
    [string]                         $Name   = ''
)

if (-not $Name) { $Name = Split-Path $BashPath -Leaf }
$tmp = Join-Path $env:TEMP ("bashconf_" + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# A script file reachable from both worlds. Written LF-only: msys and WSL both
# choke on CRLF shebang lines.
$scriptWin = Join-Path $tmp 'probe.sh'
[System.IO.File]::WriteAllText($scriptWin, "echo args=`$#:`$1,`$2`nread -r line || true`necho stdin=`$line`n", (New-Object System.Text.UTF8Encoding $false))

function Translate([string]$winPath, [string]$flavour) {
    if ($flavour -eq 'wsl') { return '/mnt/' + $winPath.Substring(0,1).ToLower() + ($winPath.Substring(2) -replace '\\','/') }
    else                    { return '/'     + $winPath.Substring(0,1).ToLower() + ($winPath.Substring(2) -replace '\\','/') }
}

# Detect flavour so path translation matches the shell under test.
$flavour = 'msys'
try { if ((& $BashPath @Prefix -c 'uname -o' 2>&1) -match 'GNU/Linux') { $flavour = 'wsl' } } catch {}
$scriptSh = Translate $scriptWin $flavour

$results = @()
function Check($label, $expected, $actual) {
    $ok = ($actual -join "`n").Trim() -eq $expected
    $script:results += [pscustomobject]@{ Test = $label; Expected = $expected; Actual = (($actual -join '|').Trim()); Pass = $ok }
}

Check 'plain -c'            'hi'      (& $BashPath @Prefix -c 'echo hi' 2>&1)
Check '-c with args'        'alpha'   (& $BashPath @Prefix -c 'echo $1' _ alpha 2>&1)
Check '-c reads stdin'      'piped'   ('piped' | & $BashPath @Prefix -c 'read -r x; echo $x' 2>&1)
Check 'quoting preserved'   'a b'     (& $BashPath @Prefix -c 'echo "a b"' 2>&1)
Check 'pipeline inside -c'  'a b c'   (& $BashPath @Prefix -c 'printf "c\nb\na\n" | sort | tr "\n" " " | sed "s/ $//"' 2>&1)
Check 'script args'         'args=2:one,two' ((& $BashPath @Prefix $scriptSh one two 2>&1) | Select-Object -First 1)
Check 'script stdin'        'stdin=fed'      (('fed' | & $BashPath @Prefix $scriptSh 2>&1) | Select-Object -Last 1)

& $BashPath @Prefix -c 'exit 7' 2>&1 | Out-Null
Check 'exit code'           '7'       @("$LASTEXITCODE")

$err = (& $BashPath @Prefix -c 'echo out; echo err 1>&2' 2>$null)
Check 'stderr separated'    'out'     $err

Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

$pass = ($results | Where-Object Pass).Count
Write-Host ("=== {0}  ({1}/{2} passed) ===" -f $Name, $pass, $results.Count)
foreach ($r in $results) {
    "{0} {1,-20} expected='{2}'  got='{3}'" -f $(if ($r.Pass) { '  PASS' } else { '  FAIL' }), $r.Test, $r.Expected, $r.Actual
}
[pscustomobject]@{ Name = $Name; Passed = $pass; Total = $results.Count; Results = $results }
