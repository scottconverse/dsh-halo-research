Set-StrictMode -Version Latest

function Get-DshWebReadiness([string] $Root = $PSScriptRoot) {
    # Keep the authenticated URL local. A bare / returning 401 proves neither
    # an authenticated page nor its browser assets are usable.
    $output = Get-Content -LiteralPath (Join-Path $Root 'logs\dsh.stdout.log') -Raw -ErrorAction Stop
    $matches = [regex]::Matches($output, 'http://127\.0\.0\.1:3080/\?token=[\w-]+')
    if (-not $matches.Count) { throw 'DSH has not published its authenticated launch link.' }
    $url = $matches[$matches.Count - 1].Value
    $page = Invoke-WebRequest $url -NoProxy -UseBasicParsing -SkipHttpErrorCheck -TimeoutSec 5 -SessionVariable session
    if ($page.StatusCode -ne 200 -or $page.Content -notmatch '<html') {
        throw 'DSH did not return its authenticated HTML page.'
    }
    $assetMatch = [regex]::Match($page.Content, '<script\b(?=[^>]*\btype=["'']module["''])[^>]*\bsrc=["'']([^"'']+)["'']')
    if (-not $assetMatch.Success) { throw 'DSH page has no application script.' }
    $asset = [Uri]::new([Uri]$url, [Net.WebUtility]::HtmlDecode($assetMatch.Groups[1].Value))
    if ($asset.Scheme -ne 'http' -or $asset.Host -ne '127.0.0.1' -or $asset.Port -ne 3080) {
        throw 'DSH application script points outside its loopback host.'
    }
    $script = Invoke-WebRequest $asset.AbsoluteUri -NoProxy -UseBasicParsing -SkipHttpErrorCheck -TimeoutSec 5 -WebSession $session
    if ($script.StatusCode -ne 200 -or $script.RawContentLength -le 0 -or $script.Content -match '^\s*<!doctype html') {
        throw 'DSH application script is unavailable.'
    }
    return [pscustomobject]@{ LaunchUrl = $url; PageStatus = 200; AssetStatus = 200 }
}
