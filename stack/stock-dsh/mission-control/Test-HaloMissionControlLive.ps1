#requires -Version 7.0

[CmdletBinding()]
param(
    [string] $BaseUri = 'http://127.0.0.1:3090',
    [Parameter(Mandatory)]
    [ValidatePattern('(?i)\A[0-9a-f]{64}\z')]
    [string] $ExpectedSourceSha256,
    [Parameter(Mandatory)]
    [ValidatePattern('(?i)\A[0-9a-f]{64}\z')]
    [string] $ExpectedReceiptSha256,
    [Parameter(Mandatory)]
    [string] $InstalledCopy,
    [Parameter(Mandatory)]
    [string] $InstallReceipt,
    [Alias('ProfileFile')]
    [string] $SettingsFile = (Join-Path $env:USERPROFILE '.dsh-stock\profiles\web\cordis.patch.yml'),
    [string] $MemoryFile = (Join-Path $env:USERPROFILE '.dsh-stock\memory\memory.json'),
    [ValidateSet('Auto', 'Required', 'Absent')]
    [string] $MemoryMode = 'Required',
    [ValidateRange(1, 300)]
    [int] $MaxPluginAgeSeconds = 60,
    [ValidateRange(1, 300)]
    [int] $MaxGpuAgeSeconds = 30,
    [ValidateRange(60, 7200)]
    [int] $MaxSnapshotAgeSeconds = 4500
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$checks = [System.Collections.Generic.List[object]]::new()
$actionToken = $null

function Add-Check([string] $Name, [bool] $Passed, [string] $Detail) {
    if ($actionToken) { $Detail = $Detail.Replace($actionToken, '[redacted action token]') }
    $checks.Add([pscustomobject]@{
        Name = $Name
        Passed = $Passed
        Detail = $Detail
    })
    if (-not $Passed) {
        throw "Mission Control live check failed: $Name - $Detail"
    }
}

function Get-Sha256([string] $Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToUpperInvariant()
}

function Get-FullPath([string] $Path) {
    return [IO.Path]::GetFullPath($Path)
}

function Test-SamePath([string] $Left, [string] $Right) {
    return [StringComparer]::OrdinalIgnoreCase.Equals((Get-FullPath $Left), (Get-FullPath $Right))
}

function Test-LocalAbsolutePath([string] $Value) {
    return -not [string]::IsNullOrWhiteSpace($Value) -and
        [IO.Path]::IsPathFullyQualified($Value) -and
        $Value -match '\A[A-Za-z]:[\\/]' -and
        $Value -notmatch '\A\\\\'
}

function Test-JsonTrue($Value) {
    return $Value -is [bool] -and $Value -eq $true
}

function Test-JsonFalse($Value) {
    return $Value -is [bool] -and $Value -eq $false
}

function Test-JsonNumber($Value, [switch] $Integer) {
    $numeric = $Value -is [int] -or $Value -is [long] -or $Value -is [double] -or $Value -is [decimal]
    if (-not $numeric) { return $false }
    $number = [double] $Value
    return -not [double]::IsNaN($number) -and -not [double]::IsInfinity($number) -and
        $number -ge 0 -and (-not $Integer -or [Math]::Floor($number) -eq $number)
}

function Assert-NumericFields([string] $Label, $Object, [string[]] $Fields, [switch] $Integer) {
    foreach ($field in $Fields) {
        $value = $Object.$field
        Add-Check "$Label numeric field: $field" (Test-JsonNumber $value -Integer:$Integer) "field=$field; value=$value; nonnegativeInteger=$([bool] $Integer)"
    }
}

function Try-GetDateTimeOffset($Value, [ref] $Result) {
    try {
        if ($Value -is [DateTimeOffset]) {
            $Result.Value = $Value
        } elseif ($Value -is [DateTime]) {
            $Result.Value = [DateTimeOffset] $Value
        } else {
            $Result.Value = [DateTimeOffset]::Parse(
                [string] $Value,
                [Globalization.CultureInfo]::InvariantCulture,
                [Globalization.DateTimeStyles]::RoundtripKind
            )
        }
        return $true
    } catch {
        return $false
    }
}

function Assert-LoopbackBaseUri([string] $Value) {
    $parsed = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref] $parsed) -or
        $parsed.Scheme -ne 'http' -or
        $parsed.Host -notin @('127.0.0.1', 'localhost') -or
        $parsed.UserInfo -or
        $parsed.Query -or
        $parsed.Fragment -or
        $parsed.AbsolutePath -notin @('', '/')) {
        throw "BaseUri must be an origin-only loopback HTTP URI (127.0.0.1 or localhost): $Value"
    }
    return $parsed.GetLeftPart([UriPartial]::Authority)
}

function Get-Api([string] $Path) {
    $response = Invoke-WebRequest -UseBasicParsing -Uri ($BaseUri.TrimEnd('/') + $Path) -TimeoutSec 20 -MaximumRedirection 0
    Add-Check "HTTP $Path" ($response.StatusCode -eq 200) "status=$($response.StatusCode)"
    $cache = [string] $response.Headers['Cache-Control']
    Add-Check "No-store $Path" ($cache -match '(?i)\bno-store\b') "Cache-Control=$cache"
    $contentType = [string] $response.Headers['Content-Type']
    Add-Check "JSON content type $Path" ($contentType -match '(?i)^application/json(?:\s*;|$)') "Content-Type=$contentType"
    try { return ($response.Content | ConvertFrom-Json -Depth 100) }
    catch { throw "Mission Control GET $Path returned invalid JSON; response text is suppressed." }
}

function Invoke-ValidationRequest([hashtable] $Headers) {
    try {
        return Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($BaseUri + '/api/validate-config') -Headers $Headers -TimeoutSec 320 -MaximumRedirection 0 -SkipHttpErrorCheck
    } catch {
        # Response bodies and transport errors can echo the supplied action token.
        # Preserve failure without emitting untrusted text or request headers.
        throw 'Mission Control validation request failed; redirects are disabled and response diagnostics are suppressed to protect the action token.'
    }
}

function Get-ConfiguredRoute([string] $Path) {
    $text = Get-Content -LiteralPath $Path -Raw
    $match = [regex]::Match(
        $text,
        '(?ms)^- id:\s*agent-default-model\s*\r?\n(?:(?!^- (?:id|insert):).)*?^[ \t]+provider:\s*([^\s#]+)[^\r\n]*\r?\n[ \t]+model:\s*([^\s#]+)'
    )
    # Explicitly supplied legacy fixtures remain readable for upgrade testing;
    # the production default above is always the Web profile.
    if (-not $match.Success) {
        $match = [regex]::Match(
            $text,
            '(?ms)^agent-default-model:\s*\r?\n(?:(?:[ \t]+.*)?\r?\n)*?[ \t]+provider:\s*([^\s#]+)[^\r\n]*\r?\n[ \t]+model:\s*([^\s#]+)'
        )
    }
    if (-not $match.Success) {
        throw "Could not parse agent-default-model plugin config from Web profile $Path"
    }
    return "$($match.Groups[1].Value)/$($match.Groups[2].Value)"
}

function Normalize-ResidentModel($Model) {
    [ordered]@{
        identifier = [string] $Model.identifier
        modelKey = [string] $Model.modelKey
        context = [int64] $Model.contextLength
        parallel = [int64] $Model.parallel
        status = [string] $Model.status
    }
}

function Get-MemoryRecordCounts([string] $Path, [string] $Label) {
    $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $relations = [Collections.Generic.List[object]]::new()
    $total = 0
    try {
        foreach ($line in Get-Content -LiteralPath $Path) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $record = ConvertFrom-Json -InputObject $line -AsHashtable -Depth 100
            if ($record -isnot [Collections.IDictionary]) { throw 'record must be an object' }
            $total++
            if ($record.type -ceq 'entity') {
                if ($record.name -isnot [string] -or [string]::IsNullOrWhiteSpace($record.name) -or
                    $record.entityType -isnot [string] -or [string]::IsNullOrWhiteSpace($record.entityType) -or
                    $record.observations -isnot [array] -or
                    @($record.observations | Where-Object { $_ -isnot [string] }).Count -gt 0 -or
                    -not $names.Add($record.name)) { throw 'invalid or duplicate entity' }
            } elseif ($record.type -ceq 'relation') {
                foreach ($field in @('from', 'to', 'relationType')) {
                    if ($record.$field -isnot [string] -or [string]::IsNullOrWhiteSpace($record.$field)) { throw 'invalid relation' }
                }
                $relations.Add($record)
            } else { throw 'unknown record type' }
        }
        foreach ($relation in $relations) {
            if (-not $names.Contains($relation.from) -or -not $names.Contains($relation.to)) { throw 'dangling relation' }
        }
    } catch {
        # Do not print remembered facts as error diagnostics.
        throw "$Label JSON records are not valid; inspect the protected source file locally: $Path"
    }
    Add-Check "$Label JSON records valid" $true "entities=$($names.Count); relations=$($relations.Count); totalRecords=$total"
    return [pscustomobject]@{ Entities = $names.Count; Relations = $relations.Count; Total = $total }
}

$origin = Assert-LoopbackBaseUri $BaseUri
$BaseUri = $origin
$expectedHash = $ExpectedSourceSha256.ToUpperInvariant()
$expectedReceiptHash = $ExpectedReceiptSha256.ToUpperInvariant()
Add-Check 'Installed copy path is local and absolute' (Test-LocalAbsolutePath $InstalledCopy) "path=$InstalledCopy"
Add-Check 'Install receipt path is local and absolute' (Test-LocalAbsolutePath $InstallReceipt) "path=$InstallReceipt"
$installedPath = Get-FullPath $InstalledCopy
$receiptPath = Get-FullPath $InstallReceipt
$settingsPath = Get-FullPath $SettingsFile
$memoryPath = Get-FullPath $MemoryFile

Add-Check 'Installed copy exists' (Test-Path -LiteralPath $installedPath -PathType Leaf) "path=$installedPath"
Add-Check 'Install receipt exists' (Test-Path -LiteralPath $receiptPath -PathType Leaf) "path=$receiptPath"
$installedHash = Get-Sha256 $installedPath
Add-Check 'Installed copy SHA-256 matches expected candidate' ($installedHash -ceq $expectedHash) "expected=$expectedHash; installed=$installedHash"
$receiptHash = Get-Sha256 $receiptPath
Add-Check 'Install receipt SHA-256 matches expected receipt' ($receiptHash -ceq $expectedReceiptHash) "expected=$expectedReceiptHash; receipt=$receiptHash"

try {
    $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json -Depth 100
} catch {
    throw "Mission Control install receipt is not valid JSON: $receiptPath - $($_.Exception.Message)"
}
Add-Check 'Receipt schema identity is current' ((Test-JsonNumber $receipt.SchemaVersion -Integer) -and $receipt.SchemaVersion -eq 1 -and [string] $receipt.ReceiptType -ceq 'HaloMissionControlInstall') "SchemaVersion=$($receipt.SchemaVersion); ReceiptType=$($receipt.ReceiptType)"
Add-Check 'Receipt action is successful' ([string] $receipt.Action -in @('Installed', 'NoOp')) "Action=$($receipt.Action); expected=Installed or NoOp"
Add-Check 'Receipt destination path is local and absolute' (Test-LocalAbsolutePath ([string] $receipt.Destination)) "path=$($receipt.Destination)"
Add-Check 'Receipt destination identifies installed copy' (Test-SamePath ([string] $receipt.Destination) $installedPath) "receipt=$($receipt.Destination); installed=$installedPath"
Add-Check 'Receipt source SHA-256 matches expected candidate' ([StringComparer]::OrdinalIgnoreCase.Equals([string] $receipt.SourceSha256, $expectedHash)) "receipt=$($receipt.SourceSha256); expected=$expectedHash"
Add-Check 'Receipt installed SHA-256 matches expected candidate' ([StringComparer]::OrdinalIgnoreCase.Equals([string] $receipt.InstalledSha256, $expectedHash)) "receipt=$($receipt.InstalledSha256); expected=$expectedHash"
Add-Check 'Receipt aggregate SHA-256 matches expected candidate' ([StringComparer]::OrdinalIgnoreCase.Equals([string] $receipt.Sha256, $expectedHash)) "receipt=$($receipt.Sha256); expected=$expectedHash"
Add-Check 'Receipt syntax check passed' ([string] $receipt.SyntaxCheck.Result -ceq 'Passed') "result=$($receipt.SyntaxCheck.Result)"
Add-Check 'Receipt syntax command recorded' (-not [string]::IsNullOrWhiteSpace([string] $receipt.SyntaxCheck.Command)) "command=$($receipt.SyntaxCheck.Command)"
Add-Check 'Receipt contract tests ran' (Test-JsonTrue $receipt.TestsRan) "TestsRan=$($receipt.TestsRan)"
Add-Check 'Receipt contract tests passed' ([string] $receipt.TestResult -ceq 'Passed') "TestResult=$($receipt.TestResult)"
Add-Check 'Receipt aggregate test command recorded' (-not [string]::IsNullOrWhiteSpace([string] $receipt.TestCommand)) "TestCommand=$($receipt.TestCommand)"

$recordedAt = [DateTimeOffset]::MinValue
Add-Check 'Receipt timestamp is valid' (Try-GetDateTimeOffset $receipt.RecordedAt ([ref] $recordedAt)) "RecordedAt=$($receipt.RecordedAt)"
Add-Check 'Receipt timestamp is not future' ($recordedAt -le [DateTimeOffset]::UtcNow.AddMinutes(5)) "RecordedAt=$($recordedAt.ToString('o')); now=$([DateTimeOffset]::UtcNow.ToString('o'))"
Add-Check 'Receipt source path is local and absolute' (Test-LocalAbsolutePath ([string] $receipt.Source)) "path=$($receipt.Source)"
Add-Check 'Receipt source exists' (Test-Path -LiteralPath ([string] $receipt.Source) -PathType Leaf) "path=$($receipt.Source)"
if (Test-Path -LiteralPath ([string] $receipt.Source) -PathType Leaf) {
    $receiptSourceHash = Get-Sha256 ([string] $receipt.Source)
    Add-Check 'Receipt source bytes match expected candidate' ($receiptSourceHash -ceq $expectedHash) "source=$receiptSourceHash; expected=$expectedHash"
}

$contractSuites = @($receipt.ContractSuites)
$expectedSuiteDirectory = Get-FullPath (Join-Path (Split-Path -Parent ([string] $receipt.Source)) 'test')
Add-Check 'Canonical contract suite directory exists' (Test-Path -LiteralPath $expectedSuiteDirectory -PathType Container) "path=$expectedSuiteDirectory"
$requiredSuiteNames = @(
    'reasoning-contract.test.mjs'
    'data-contract.test.mjs'
    'ui-contract.test.mjs'
    'installer-contract.test.mjs'
)
Add-Check 'Canonical contract suite set is nonempty' ($requiredSuiteNames.Count -gt 0) "count=$($requiredSuiteNames.Count)"
$receiptSuiteNames = @($contractSuites | ForEach-Object { [string] $_.Name })
$missingSuites = @($requiredSuiteNames | Where-Object { $_ -notin $receiptSuiteNames })
$unexpectedSuites = @($receiptSuiteNames | Where-Object { $_ -notin $requiredSuiteNames })
$uniqueSuiteNames = @($receiptSuiteNames | Sort-Object -Unique)
Add-Check 'Receipt contract suite set is exact' (
    $contractSuites.Count -eq $requiredSuiteNames.Count -and
    $receiptSuiteNames.Count -eq $uniqueSuiteNames.Count -and
    $missingSuites.Count -eq 0 -and
    $unexpectedSuites.Count -eq 0
) "count=$($contractSuites.Count); missing=$($missingSuites -join ','); unexpected=$($unexpectedSuites -join ','); unique=$($uniqueSuiteNames.Count)"
foreach ($suite in $contractSuites) {
    $suiteName = [string] $suite.Name
    $suitePath = [string] $suite.Path
    Add-Check "Receipt suite path is local: $suiteName" (Test-LocalAbsolutePath $suitePath) "path=$suitePath"
    Add-Check "Receipt suite path identity: $suiteName" ([IO.Path]::GetFileName($suitePath) -ceq $suiteName -and (Test-SamePath (Split-Path -Parent $suitePath) $expectedSuiteDirectory)) "path=$suitePath; expectedDirectory=$expectedSuiteDirectory"
    Add-Check "Receipt suite passed: $suiteName" ([string] $suite.TestResult -ceq 'Passed') "TestResult=$($suite.TestResult)"
    Add-Check "Receipt suite command recorded: $suiteName" (-not [string]::IsNullOrWhiteSpace([string] $suite.TestCommand)) "TestCommand=$($suite.TestCommand)"
    Add-Check "Receipt suite exists: $suiteName" (Test-Path -LiteralPath $suitePath -PathType Leaf) "path=$suitePath"
    if (Test-Path -LiteralPath $suitePath -PathType Leaf) {
        $suiteHash = Get-Sha256 $suitePath
        Add-Check "Receipt suite hash current: $suiteName" ([StringComparer]::OrdinalIgnoreCase.Equals($suiteHash, [string] $suite.SuiteSha256)) "receipt=$($suite.SuiteSha256); actual=$suiteHash"
    }
}

$pageResponse = Invoke-WebRequest -UseBasicParsing -Uri ($BaseUri + '/') -TimeoutSec 20 -MaximumRedirection 0
Add-Check 'HTTP /' ($pageResponse.StatusCode -eq 200) "status=$($pageResponse.StatusCode)"
$pageCache = [string] $pageResponse.Headers['Cache-Control']
Add-Check 'No-store /' ($pageCache -match '(?i)\bno-store\b') "Cache-Control=$pageCache"
$pageContentType = [string] $pageResponse.Headers['Content-Type']
Add-Check 'HTML content type /' ($pageContentType -match '(?i)^text/html(?:\s*;|$)') "Content-Type=$pageContentType"
$tokenMatches = [regex]::Matches([string] $pageResponse.Content, '(?i)\bvar\s+MC_TOKEN\s*=\s*[''"](?<token>[0-9a-f]{48})[''"]')
Add-Check 'Exactly one per-boot action token extracted from GET /' ($tokenMatches.Count -eq 1) "actionTokenCount=$($tokenMatches.Count)"
$actionToken = $tokenMatches[0].Groups['token'].Value

$status = Get-Api '/api/status'
Add-Check 'Runtime build source is installed copy' (Test-SamePath ([string] $status.build.sourceFile) $installedPath) "runtime=$($status.build.sourceFile); installed=$installedPath"
Add-Check 'Runtime build SHA-256 is expected candidate' ([StringComparer]::OrdinalIgnoreCase.Equals([string] $status.build.sourceSha256, $expectedHash)) "runtime=$($status.build.sourceSha256); expected=$expectedHash"

foreach ($probe in @(
    @{ Name = 'Missing token'; Headers = @{ Origin = $origin } },
    @{ Name = 'Invalid token'; Headers = @{ Origin = $origin; 'x-mc-token' = ('0' * 48) } },
    @{ Name = 'Lookalike origin'; Headers = @{ Origin = 'http://127.0.0.1.evil.invalid:3090'; 'x-mc-token' = $actionToken } }
)) {
    $probeResponse = Invoke-ValidationRequest $probe.Headers
    Add-Check "Unauthenticated validation rejected: $($probe.Name)" ($probeResponse.StatusCode -eq 403) "status=$($probeResponse.StatusCode); expected=403"
}

$validationStartedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$validationResponse = Invoke-ValidationRequest @{
    'x-mc-token' = $actionToken
    'Origin' = $origin
}
$validationFinishedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Add-Check 'HTTP POST /api/validate-config' ($validationResponse.StatusCode -eq 200) "status=$($validationResponse.StatusCode)"
$validationCache = [string] $validationResponse.Headers['Cache-Control']
Add-Check 'No-store POST /api/validate-config' ($validationCache -match '(?i)\bno-store\b') "Cache-Control=$validationCache"
$validationContentType = [string] $validationResponse.Headers['Content-Type']
Add-Check 'JSON content type POST /api/validate-config' ($validationContentType -match '(?i)^application/json(?:\s*;|$)') "Content-Type=$validationContentType"
try {
    $validation = $validationResponse.Content | ConvertFrom-Json -Depth 100
} catch {
    throw 'POST /api/validate-config returned invalid JSON; response text is suppressed.'
}
Add-Check 'Live configuration validation passed' (Test-JsonTrue $validation.ok) "warnings=$(@($validation.warnings) -join '; ')"
Add-Check 'Live configuration validation has no warnings' (@($validation.warnings).Count -eq 0) "warnings=$(@($validation.warnings) -join '; ')"
Assert-NumericFields 'Live validation' $validation @('when') -Integer
$validationWhen = if ($null -ne $validation.when) { [int64] $validation.when } else { 0 }
$validationTimeFresh = $validationWhen -ge ($validationStartedAt - 5000) -and $validationWhen -le ($validationFinishedAt + 5000)
Add-Check 'Live configuration validation is from this invocation' $validationTimeFresh "when=$validationWhen; started=$validationStartedAt; finished=$validationFinishedAt"

$status = Get-Api '/api/status'
Add-Check 'Runtime build source remains installed copy after validation' (Test-SamePath ([string] $status.build.sourceFile) $installedPath) "runtime=$($status.build.sourceFile); installed=$installedPath"
Add-Check 'Runtime build SHA-256 remains expected candidate after validation' ([StringComparer]::OrdinalIgnoreCase.Equals([string] $status.build.sourceSha256, $expectedHash)) "runtime=$($status.build.sourceSha256); expected=$expectedHash"
$catalog = Get-Api '/api/catalog'
$sessions = Get-Api '/api/sessions?all=1'
$plugins = Get-Api '/api/plugins'
$memory = Get-Api '/api/memory-graph'
$history = Get-Api '/api/history?hours=6'
$settings = Get-Api '/api/settings'

Assert-NumericFields 'Runtime validation' $status.validation @('when') -Integer
Add-Check 'Runtime validation matches this POST' ([int64] $status.validation.when -eq $validationWhen -and (Test-JsonTrue $status.validation.ok)) "runtimeWhen=$($status.validation.when); postedWhen=$validationWhen; ok=$($status.validation.ok)"
Add-Check 'Runtime validation freshness is current' ([string] $status.validation.freshness.state -ceq 'current') "freshness=$($status.validation.freshness.state); ageMs=$($status.validation.freshness.ageMs)"

Add-Check 'Cockpit connection' (Test-JsonTrue $status.services.cockpit) 'DSH :3080 is reachable'
Add-Check 'LM Studio connection' (Test-JsonTrue $status.services.lmstudio) 'LM Studio :1234 is reachable'
Add-Check 'lms CLI connection' (Test-JsonTrue $status.services.lmsCli) 'lms CLI returned model state'
Add-Check 'DSH session source' ($status.sessionsSource -eq 'dsh api') "source=$($status.sessionsSource)"

$lms = Get-Command lms -ErrorAction Stop
$lmsModels = @((& $lms.Source ps --json | ConvertFrom-Json -Depth 100))
if ($LASTEXITCODE -ne 0) {
    throw "lms ps --json failed with exit code $LASTEXITCODE"
}
$expectedModels = @($lmsModels | ForEach-Object { Normalize-ResidentModel $_ } | Sort-Object identifier) | ConvertTo-Json -Compress -Depth 5 -AsArray
foreach ($model in $status.models) { Assert-NumericFields 'Resident model' $model @('context', 'parallel') -Integer }
$reportedModels = @($status.models | ForEach-Object {
    [ordered]@{
        identifier = [string] $_.identifier
        modelKey = [string] $_.modelKey
        context = [int64] $_.context
        parallel = [int64] $_.parallel
        status = [string] $_.status
    }
} | Sort-Object identifier) | ConvertTo-Json -Compress -Depth 5 -AsArray
Add-Check 'Resident model parity' ($expectedModels -ceq $reportedModels) "lms=$expectedModels; mission-control=$reportedModels"

$configuredRoute = Get-ConfiguredRoute $SettingsFile
Add-Check 'Configured DSH route parity' ($status.routeRuntime.configured -eq $configuredRoute) "settings=$configuredRoute; mission-control=$($status.routeRuntime.configured)"
Add-Check 'Route residency is Boolean' ($status.routeRuntime.exactResident -is [bool]) "resident=$($status.routeRuntime.exactResident)"
Add-Check 'Route residency applicability is Boolean' ($status.routeRuntime.residencyApplicable -is [bool]) "applicable=$($status.routeRuntime.residencyApplicable)"
Add-Check 'Route state explained' ((Test-JsonTrue $status.routeRuntime.exactResident) -or (Test-JsonFalse $status.routeRuntime.residencyApplicable) -or -not [string]::IsNullOrWhiteSpace([string] $status.routeRuntime.warning)) "resident=$($status.routeRuntime.exactResident); applicable=$($status.routeRuntime.residencyApplicable); warning=$($status.routeRuntime.warning)"

Add-Check 'Catalog available' (-not [bool] $catalog.error) "entries=$(@($catalog.catalog).Count)"
Add-Check 'Catalog resident identity parity' (@($status.models | Where-Object {
    $resident = $_
    -not @($catalog.catalog | Where-Object {
        (Test-JsonTrue $_.loaded) -and $_.identifier -ceq $resident.identifier -and
        $_.residentModelKey -ceq $resident.modelKey -and $_.originKind -ceq $resident.originKind -and
        $_.deviceId -ceq $resident.deviceId
    }).Count
}).Count -eq 0) 'every lms resident has a Boolean-loaded catalog row with matching identifier, resident key, origin, and device'

$pluginProperties = @($plugins.PSObject.Properties.Name)
Add-Check 'Plugin response has non-error summary' (
    $pluginProperties -contains 'error' -and
    $pluginProperties -contains 'summary' -and
    $null -ne $plugins.summary -and
    (Test-JsonFalse $plugins.error)
) "error=$($plugins.error); summaryPresent=$($null -ne $plugins.summary)"
Add-Check 'Plugin cache is current' ([string] $plugins.cacheState -ceq 'current' -and [string] $plugins.summary.cacheState -ceq 'current') "cacheState=$($plugins.cacheState); summaryCacheState=$($plugins.summary.cacheState)"
Add-Check 'Plugin cache is not stale' ((Test-JsonFalse $plugins.stale) -and (Test-JsonFalse $plugins.summary.stale)) "stale=$($plugins.stale); summaryStale=$($plugins.summary.stale)"
Add-Check 'Plugin refresh has no error' ([string]::IsNullOrWhiteSpace([string] $plugins.refreshError)) "refreshError=$($plugins.refreshError)"
Assert-NumericFields 'Plugin freshness' $plugins @('sourceAgeMs', 'sampledAt') -Integer
Assert-NumericFields 'Plugin summary' $plugins.summary @('total', 'active', 'disabled', 'waiting', 'transitioning', 'failed', 'stuck') -Integer
$pluginMaxAgeMs = [int64] $MaxPluginAgeSeconds * 1000
$pluginSourceAgeMs = if ($null -ne $plugins.sourceAgeMs) { [int64] $plugins.sourceAgeMs } else { -1 }
$pluginSampledAt = if ($null -ne $plugins.sampledAt) { [int64] $plugins.sampledAt } else { 0 }
$pluginClockAgeMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $pluginSampledAt
Add-Check 'Plugin cache source age is current' ($pluginSourceAgeMs -ge 0 -and $pluginSourceAgeMs -le $pluginMaxAgeMs) "sourceAgeMs=$pluginSourceAgeMs; maximumMs=$pluginMaxAgeMs"
Add-Check 'Plugin cache timestamp is current' ($pluginSampledAt -gt 0 -and $pluginClockAgeMs -ge -5000 -and $pluginClockAgeMs -le ($pluginMaxAgeMs + 5000)) "sampledAt=$pluginSampledAt; clockAgeMs=$pluginClockAgeMs; maximumMs=$pluginMaxAgeMs"
Add-Check 'Plugin inventory parity' ([int] $plugins.summary.total -eq @($plugins.entries).Count) "summary=$($plugins.summary.total); entries=$(@($plugins.entries).Count)"
$pluginBuckets = [int] $plugins.summary.active + [int] $plugins.summary.disabled + [int] $plugins.summary.waiting + [int] $plugins.summary.transitioning + [int] $plugins.summary.failed
Add-Check 'Plugin buckets complete' ($pluginBuckets -eq [int] $plugins.summary.total) "buckets=$pluginBuckets; total=$($plugins.summary.total)"
foreach ($bucket in @('active', 'disabled', 'waiting', 'transitioning', 'failed')) {
    $entryCount = @($plugins.entries | Where-Object { [string] $_.bucket -ceq $bucket }).Count
    Add-Check "Plugin bucket classification parity: $bucket" ($entryCount -eq $plugins.summary.$bucket) "entries=$entryCount; summary=$($plugins.summary.$bucket)"
}
Add-Check 'Plugin summary has no failed entries' ([int] $plugins.summary.failed -eq 0 -and @($plugins.summary.failedList).Count -eq 0) "failed=$($plugins.summary.failed); failedList=$(@($plugins.summary.failedList) -join ',')"
Add-Check 'Plugin summary has no stuck entries' ([int] $plugins.summary.stuck -eq 0 -and @($plugins.summary.stuckList).Count -eq 0) "stuck=$($plugins.summary.stuck); stuckList=$(@($plugins.summary.stuckList) -join ',')"
$pluginEntryIds = @($plugins.entries | ForEach-Object { [string] $_.entryId })
$uniquePluginEntryIds = @($pluginEntryIds | Sort-Object -Unique)
Add-Check 'Plugin entry IDs are unique and nonblank' ($pluginEntryIds.Count -eq $uniquePluginEntryIds.Count -and @($pluginEntryIds | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count -eq 0) "entries=$($pluginEntryIds.Count); unique=$($uniquePluginEntryIds.Count)"

Add-Check 'Session inventory available' ($sessions.PSObject.Properties.Name -contains 'sessions') "count=$(@($sessions.sessions).Count)"
Assert-NumericFields 'Stall inventory' $status.stalledSessions @('inventoryCount', 'count') -Integer
Add-Check 'Stall inventory complete' ([int] $status.stalledSessions.inventoryCount -eq @($sessions.sessions).Count) "status=$($status.stalledSessions.inventoryCount); sessions=$(@($sessions.sessions).Count)"

$resolvedMemoryMode = if ($MemoryMode -ceq 'Auto') {
    if (Test-Path -LiteralPath $memoryPath -PathType Leaf) { 'Required' } else { 'Absent' }
} else {
    $MemoryMode
}
Add-Check 'Memory mode resolved' ($resolvedMemoryMode -in @('Required', 'Absent')) "requested=$MemoryMode; resolved=$resolvedMemoryMode"
Add-Check 'Memory status file identity' (Test-SamePath ([string] $status.memory.file) $memoryPath) "status=$($status.memory.file); expected=$memoryPath"
Add-Check 'Memory graph file identity' (Test-SamePath ([string] $memory.file) $memoryPath) "graph=$($memory.file); expected=$memoryPath"
Assert-NumericFields 'Memory status' $status.memory @('entities', 'relations', 'totalRecords', 'invalidRecords', 'malformedRecords', 'duplicateEntities', 'danglingRelations') -Integer
Assert-NumericFields 'Memory graph' $memory @('relationCount', 'invalidRecords', 'malformedRecords', 'duplicateEntities', 'danglingRelations') -Integer
Add-Check 'Memory status records are valid' ([int] $status.memory.invalidRecords -eq 0 -and [int] $status.memory.malformedRecords -eq 0 -and [int] $status.memory.duplicateEntities -eq 0 -and [int] $status.memory.danglingRelations -eq 0) ($status.memory | ConvertTo-Json -Compress -Depth 5)
Add-Check 'Memory graph records are valid' ([int] $memory.invalidRecords -eq 0 -and [int] $memory.malformedRecords -eq 0 -and [int] $memory.duplicateEntities -eq 0 -and [int] $memory.danglingRelations -eq 0) ($memory | ConvertTo-Json -Compress -Depth 5)
Add-Check 'Memory entity parity' ([int] $status.memory.entities -eq @($memory.entities).Count) "status=$($status.memory.entities); graph=$(@($memory.entities).Count)"
Add-Check 'Memory relation parity' ([int] $status.memory.relations -eq @($memory.relations).Count) "status=$($status.memory.relations); graph=$(@($memory.relations).Count)"

$writer = $status.memory.writer
Add-Check 'Memory writer cache current' ([string] $writer.cacheState -ceq 'current' -and [string]::IsNullOrWhiteSpace([string] $writer.error)) "cacheState=$($writer.cacheState); error=$($writer.error)"
$writerEntries = @($plugins.entries | Where-Object { [string] $_.entryId -eq [string] $writer.entryId -and [string] $_.entryId -match '(?:^|:)memory-mcp-reference$' })
if ($resolvedMemoryMode -ceq 'Required') {
    Add-Check 'Memory store exists' (Test-Path -LiteralPath $memoryPath -PathType Leaf) "path=$memoryPath"
    $memoryCounts = Get-MemoryRecordCounts $memoryPath 'Memory store'
    Add-Check 'Memory status parsed' ((Test-JsonTrue $status.memory.ok) -and [string]::IsNullOrWhiteSpace([string] $status.memory.error)) "ok=$($status.memory.ok); error=$($status.memory.error)"
    Add-Check 'Memory graph parsed' ((Test-JsonTrue $memory.ok) -and [string]::IsNullOrWhiteSpace([string] $memory.error)) "ok=$($memory.ok); error=$($memory.error)"
    Add-Check 'Memory store record count parity' ($status.memory.entities -eq $memoryCounts.Entities -and $status.memory.relations -eq $memoryCounts.Relations -and $status.memory.totalRecords -eq $memoryCounts.Total) "statusEntities=$($status.memory.entities); actualEntities=$($memoryCounts.Entities); statusRelations=$($status.memory.relations); actualRelations=$($memoryCounts.Relations); actualRecords=$($memoryCounts.Total)"
    Add-Check 'Memory writer configured' (Test-JsonTrue $writer.configured) "configured=$($writer.configured); entryId=$($writer.entryId)"
    Add-Check 'Memory writer active' (Test-JsonTrue $writer.active) "active=$($writer.active); entryId=$($writer.entryId)"
    Add-Check 'Memory writer matches one plugin entry' ($writerEntries.Count -eq 1) "entryId=$($writer.entryId); matches=$($writerEntries.Count)"
    $writerEntry = $writerEntries | Select-Object -First 1
    Add-Check 'Memory writer plugin entry active' (
        (Test-JsonTrue $writerEntry.enabled) -and
        [string] $writerEntry.fiberPhase -ceq 'active' -and
        [string] $writerEntry.bucket -ceq 'active' -and
        (Test-JsonFalse $writerEntry.stuck)
    ) "entryId=$($writerEntry.entryId); enabled=$($writerEntry.enabled); phase=$($writerEntry.fiberPhase); bucket=$($writerEntry.bucket); stuck=$($writerEntry.stuck)"
} else {
    Add-Check 'Memory store is intentionally absent' (-not (Test-Path -LiteralPath $memoryPath -PathType Leaf)) "path=$memoryPath"
    Add-Check 'Memory status reports not configured' ((Test-JsonFalse $status.memory.ok) -and [string] $status.memory.error -ceq 'not configured') "ok=$($status.memory.ok); error=$($status.memory.error)"
    Add-Check 'Memory graph reports not configured' ((Test-JsonFalse $memory.ok) -and [string] $memory.error -ceq 'not configured') "ok=$($memory.ok); error=$($memory.error)"
    Add-Check 'Absent memory has zero records' ([int] $status.memory.entities -eq 0 -and [int] $status.memory.relations -eq 0 -and [int] $status.memory.totalRecords -eq 0 -and @($memory.entities).Count -eq 0 -and @($memory.relations).Count -eq 0) "statusEntities=$($status.memory.entities); statusRelations=$($status.memory.relations); graphEntities=$(@($memory.entities).Count); graphRelations=$(@($memory.relations).Count)"
    Add-Check 'Memory writer is unconfigured' ((Test-JsonFalse $writer.configured) -and (Test-JsonFalse $writer.active) -and [string]::IsNullOrWhiteSpace([string] $writer.entryId) -and $writerEntries.Count -eq 0) "configured=$($writer.configured); active=$($writer.active); entryId=$($writer.entryId); matches=$($writerEntries.Count)"
}

$snapshotTask = $status.memory.snapshotTask
Add-Check 'Memory snapshot task identity' ([string] $snapshotTask.taskName -ceq 'HALO Memory Snapshot') "taskName=$($snapshotTask.taskName)"
Add-Check 'Memory snapshot task configured' (Test-JsonTrue $snapshotTask.configured) "configured=$($snapshotTask.configured); state=$($snapshotTask.state)"
Add-Check 'Memory snapshot task definition exact' (Test-JsonTrue $snapshotTask.definitionValid) "issues=$(@($snapshotTask.definitionIssues) -join '; ')"
Add-Check 'Memory snapshot task healthy' ([string]::IsNullOrWhiteSpace([string] $snapshotTask.error) -and [string] $snapshotTask.state -in @('Ready', 'Running')) "state=$($snapshotTask.state); error=$($snapshotTask.error)"
Add-Check 'Memory snapshot task executable exact' (Test-SamePath ([string] $snapshotTask.action.execute) ([string] $snapshotTask.expected.powerShellExecutable)) "actual=$($snapshotTask.action.execute); expected=$($snapshotTask.expected.powerShellExecutable)"
$expectedSnapshotScript = Join-Path (Split-Path -Parent ([string] $receipt.Source)) 'Snapshot-HaloMemory.ps1'
Add-Check 'Memory snapshot task script exact' (Test-SamePath ([string] $snapshotTask.expected.snapshotScript) $expectedSnapshotScript) "script=$($snapshotTask.expected.snapshotScript); expected=$expectedSnapshotScript"
Add-Check 'Memory snapshot task source exact' (Test-SamePath ([string] $snapshotTask.expected.source) $memoryPath) "source=$($snapshotTask.expected.source); expected=$memoryPath"
$expectedSnapshotDirectoryFromTask = Join-Path (Split-Path -Parent $memoryPath) 'snapshots'
Add-Check 'Memory snapshot task destination exact' (Test-SamePath ([string] $snapshotTask.expected.destination) $expectedSnapshotDirectoryFromTask) "destination=$($snapshotTask.expected.destination); expected=$expectedSnapshotDirectoryFromTask"
Add-Check 'Memory snapshot task retention exact' ([int] $snapshotTask.expected.retention -eq 168 -and [string] $snapshotTask.action.arguments -ceq [string] $snapshotTask.expected.arguments) "retention=$($snapshotTask.expected.retention); arguments=$($snapshotTask.action.arguments)"
Add-Check 'Memory snapshot task missed-run recovery' (Test-JsonTrue $snapshotTask.startWhenAvailable) "startWhenAvailable=$($snapshotTask.startWhenAvailable)"
Add-Check 'Memory snapshot task overlap prevention' ([string] $snapshotTask.multipleInstances -ceq 'IgnoreNew') "multipleInstances=$($snapshotTask.multipleInstances)"
$hourlyTriggers = @($snapshotTask.triggers | Where-Object { [string] $_.type -ceq 'MSFT_TaskTimeTrigger' -and (Test-JsonTrue $_.enabled) -and [string] $_.repetitionInterval -ceq 'PT1H' })
$startupTriggers = @($snapshotTask.triggers | Where-Object { [string] $_.type -ceq 'MSFT_TaskBootTrigger' -and (Test-JsonTrue $_.enabled) })
Add-Check 'Memory snapshot task hourly trigger exact' ($hourlyTriggers.Count -eq 1) "matches=$($hourlyTriggers.Count)"
Add-Check 'Memory snapshot task startup trigger exact' ($startupTriggers.Count -eq 1) "matches=$($startupTriggers.Count)"
Assert-NumericFields 'Memory snapshot task' $snapshotTask @('lastTaskResult') -Integer
Add-Check 'Memory snapshot task last result succeeded' ([int64] $snapshotTask.lastTaskResult -eq 0) "lastTaskResult=$($snapshotTask.lastTaskResult)"
$lastRunTime = [DateTimeOffset]::MinValue
$nextRunTime = [DateTimeOffset]::MinValue
Add-Check 'Memory snapshot task last-run time valid' (Try-GetDateTimeOffset $snapshotTask.lastRunTime ([ref] $lastRunTime)) "lastRunTime=$($snapshotTask.lastRunTime)"
Add-Check 'Memory snapshot task next-run time valid' (Try-GetDateTimeOffset $snapshotTask.nextRunTime ([ref] $nextRunTime)) "nextRunTime=$($snapshotTask.nextRunTime)"

$snapshots = $status.memory.snapshots
$snapshotPath = $null
$snapshotSha256 = $null
if ($resolvedMemoryMode -ceq 'Required') {
    Assert-NumericFields 'Memory snapshot' $snapshots @('count', 'ageMs') -Integer
    Add-Check 'Memory snapshots available' ((Test-JsonTrue $snapshots.ok) -and [string]::IsNullOrWhiteSpace([string] $snapshots.error) -and [int] $snapshots.count -gt 0) "ok=$($snapshots.ok); count=$($snapshots.count); error=$($snapshots.error)"
    Add-Check 'Memory snapshot not overdue' (Test-JsonFalse $snapshots.overdue) "overdue=$($snapshots.overdue); ageMs=$($snapshots.ageMs)"
    $snapshotMaxAgeMs = [int64] $MaxSnapshotAgeSeconds * 1000
    $snapshotAgeMs = if ($null -ne $snapshots.ageMs) { [int64] $snapshots.ageMs } else { -1 }
    Add-Check 'Memory snapshot fresh' ($snapshotAgeMs -ge 0 -and $snapshotAgeMs -le $snapshotMaxAgeMs) "ageMs=$snapshotAgeMs; maximumMs=$snapshotMaxAgeMs"
    $snapshotPath = Get-FullPath ([string] $snapshots.file)
    $expectedSnapshotDirectory = Get-FullPath (Join-Path (Split-Path -Parent $memoryPath) 'snapshots')
    Add-Check 'Memory snapshot directory identity' (Test-SamePath (Split-Path -Parent $snapshotPath) $expectedSnapshotDirectory) "snapshot=$snapshotPath; expectedDirectory=$expectedSnapshotDirectory"
    Add-Check 'Memory snapshot file exists' (Test-Path -LiteralPath $snapshotPath -PathType Leaf) "path=$snapshotPath"
    $snapshotItem = Get-Item -LiteralPath $snapshotPath
    Add-Check 'Memory snapshot file is nonempty' ($snapshotItem.Length -gt 0) "path=$snapshotPath; bytes=$($snapshotItem.Length)"
    $null = Get-MemoryRecordCounts $snapshotPath 'Memory snapshot'
    $snapshotNameMatch = [regex]::Match($snapshotItem.Name, '\Amemory-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json\z')
    Add-Check 'Memory snapshot filename canonical' $snapshotNameMatch.Success "name=$($snapshotItem.Name)"
    $snapshotReportedAt = [DateTimeOffset]::MinValue
    Add-Check 'Memory snapshot reported time valid' (Try-GetDateTimeOffset $snapshots.lastSnapshotAt ([ref] $snapshotReportedAt)) "lastSnapshotAt=$($snapshots.lastSnapshotAt)"
    $snapshotFilenameAt = [DateTimeOffset] [DateTime]::ParseExact($snapshotItem.BaseName.Substring(7), 'yyyyMMdd-HHmmss', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeLocal)
    Add-Check 'Memory snapshot filename time corroborated' ([Math]::Abs(($snapshotReportedAt - $snapshotFilenameAt).TotalMilliseconds) -lt 1000) "reportedAt=$($snapshotReportedAt.ToString('o')); filenameAt=$($snapshotFilenameAt.ToString('o'))"
    $snapshotReportedAgeMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $snapshotReportedAt.ToUnixTimeMilliseconds()
    $snapshotAgeDifferenceMs = [Math]::Abs($snapshotReportedAgeMs - $snapshotAgeMs)
    Add-Check 'Memory snapshot reported age corroborated' ($snapshotReportedAgeMs -ge -5000 -and $snapshotAgeDifferenceMs -le 5000) "reportedAgeMs=$snapshotReportedAgeMs; payloadAgeMs=$snapshotAgeMs; differenceMs=$snapshotAgeDifferenceMs"
    $snapshotSha256 = Get-Sha256 $snapshotPath
} else {
    Add-Check 'Memory snapshots report not configured' ((Test-JsonFalse $snapshots.ok) -and [string] $snapshots.error -ceq 'not configured' -and [int] $snapshots.count -eq 0 -and $null -eq $snapshots.file -and $null -eq $snapshots.ageMs -and $null -eq $snapshots.overdue) ($snapshots | ConvertTo-Json -Compress -Depth 5)
}

Assert-NumericFields 'RAM' $status.ram @('totalGiB', 'freeGiB', 'usedGiB')
Add-Check 'RAM values sane' ($status.ram.totalGiB -gt 0 -and $status.ram.freeGiB -le $status.ram.totalGiB -and $status.ram.usedGiB -le $status.ram.totalGiB) ($status.ram | ConvertTo-Json -Compress)
$gpuIsHealthy = Test-JsonTrue $status.gpu.ok
if (-not $gpuIsHealthy) {
    $degradedShapeValid = (Test-JsonFalse $status.gpu.ok) -and
        $null -eq $status.gpu.dedicatedGiB -and
        $null -eq $status.gpu.sharedGiB -and
        -not [string]::IsNullOrWhiteSpace([string] $status.gpu.error)
    Add-Check 'GPU degraded payload is honest' $degradedShapeValid "state=Degraded; gpu=$($status.gpu | ConvertTo-Json -Compress)"
    Add-Check 'GPU telemetry healthy' $false "state=Degraded; error=$($status.gpu.error)"
}
Assert-NumericFields 'GPU' $status.gpu @('dedicatedGiB', 'sharedGiB')
Assert-NumericFields 'GPU sample' $status.gpu @('sampledAt') -Integer
$gpuDedicatedGiB = [double] $status.gpu.dedicatedGiB
$gpuSharedGiB = [double] $status.gpu.sharedGiB
$gpuValuesHealthy = -not [double]::IsNaN($gpuDedicatedGiB) -and -not [double]::IsInfinity($gpuDedicatedGiB) -and $gpuDedicatedGiB -ge 0 -and
    -not [double]::IsNaN($gpuSharedGiB) -and -not [double]::IsInfinity($gpuSharedGiB) -and $gpuSharedGiB -ge 0 -and
    [string]::IsNullOrWhiteSpace([string] $status.gpu.error)
Add-Check 'GPU telemetry values healthy' $gpuValuesHealthy "state=Healthy; dedicatedGiB=$gpuDedicatedGiB; sharedGiB=$gpuSharedGiB; error=$($status.gpu.error)"
$gpuMaxAgeMs = [int64] $MaxGpuAgeSeconds * 1000
$gpuSampledAt = if ($null -ne $status.gpu.sampledAt) { [int64] $status.gpu.sampledAt } else { 0 }
$gpuAgeMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $gpuSampledAt
Add-Check 'GPU telemetry sample fresh' ($gpuSampledAt -gt 0 -and $gpuAgeMs -ge -5000 -and $gpuAgeMs -le ($gpuMaxAgeMs + 5000)) "state=Healthy; sampledAt=$gpuSampledAt; ageMs=$gpuAgeMs; maximumMs=$gpuMaxAgeMs"
Assert-NumericFields 'Disk' $status.disk @('totalGB', 'freeGB', 'usedGB')
Add-Check 'Disk values sane' ((Test-JsonTrue $status.disk.ok) -and $status.disk.totalGB -gt 0 -and $status.disk.freeGB -le $status.disk.totalGB -and $status.disk.usedGB -le $status.disk.totalGB) ($status.disk | ConvertTo-Json -Compress)
Add-Check 'Validation freshness explicit' ($status.validation.PSObject.Properties.Name -contains 'freshness') ($status.validation | ConvertTo-Json -Compress -Depth 5)
Add-Check 'History response shaped' ($history.PSObject.Properties.Name -contains 'rows') "rows=$(@($history.rows).Count)"
$unprovenDecodeRows = @($history.rows | Where-Object { $_.decodeTps -ne $null -and [string]::IsNullOrWhiteSpace([string] $_.decodeSourceKey) })
Add-Check 'History decode provenance' ($unprovenDecodeRows.Count -eq 0) "unproven=$($unprovenDecodeRows.Count)"
Add-Check 'Settings response shaped' ($settings.PSObject.Properties.Name -contains 'rows') "rows=$(@($settings.rows).Count)"

Add-Check 'Installed copy unchanged during live acceptance' ((Get-Sha256 $installedPath) -ceq $expectedHash) "expected=$expectedHash; actual=$(Get-Sha256 $installedPath)"
Add-Check 'Install receipt unchanged during live acceptance' ((Get-Sha256 $receiptPath) -ceq $expectedReceiptHash) "expected=$expectedReceiptHash; actual=$(Get-Sha256 $receiptPath)"

[pscustomobject]@{
    CheckedAt = (Get-Date).ToUniversalTime().ToString('o')
    BaseUri = $BaseUri
    Passed = $true
    Health = 'Healthy'
    Candidate = [ordered]@{
        SourceSha256 = $expectedHash
        InstalledCopy = $installedPath
        InstallReceipt = $receiptPath
        ReceiptSha256 = $receiptHash
        ReceiptRecordedAt = $recordedAt.ToUniversalTime().ToString('o')
    }
    Validation = [ordered]@{
        When = $validationWhen
        Ok = $true
    }
    Memory = [ordered]@{
        Mode = $resolvedMemoryMode
        File = $memoryPath
        Snapshot = $snapshotPath
        SnapshotSha256 = $snapshotSha256
        WriterEntryId = [string] $writer.entryId
        SnapshotTask = [string] $snapshotTask.taskName
    }
    CheckCount = $checks.Count
    Checks = $checks
} | ConvertTo-Json -Depth 10
