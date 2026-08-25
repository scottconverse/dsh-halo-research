<#
  Convert-ForGoogleDocs.ps1 — turn the assembled markdown report into plain
  semantic HTML that Google Drive will import cleanly as a Google Doc.

  Deliberately NOT the styled artifact HTML: Drive's importer ignores most CSS
  and mangles custom divs. Semantic tags only — h1..h4, p, table, ul/ol, pre,
  blockquote, strong, em, code.
#>
param(
    [string]$In  = 'C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report.md',
    [string]$Out = 'C:\Users\scott\Desktop\Code\dsh-halo-research\DSH-Strix-Halo-Report.gdoc.html'
)

$ErrorActionPreference = 'Stop'
$lines = Get-Content $In -Encoding UTF8

function Esc([string]$s) {
    if ($null -eq $s) { return '' }
    $s = $s -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
    return $s
}

# Inline markdown -> HTML. Code spans are extracted first so their contents are
# never re-processed as bold/italic.
function Inline([string]$s) {
    $s = Esc $s
    $codes = New-Object System.Collections.ArrayList
    $s = [regex]::Replace($s, '`([^`]+)`', {
        param($m)
        $i = $codes.Add($m.Groups[1].Value)
        "`u{E000}$i`u{E001}"
    })
    # Non-greedy and asterisk-tolerant, so nested italics survive: **bold *word* more**
    $s = [regex]::Replace($s, '\*\*(.+?)\*\*', '<strong>$1</strong>')
    $s = [regex]::Replace($s, '(?<![A-Za-z0-9*])\*([^*\n]+)\*(?![A-Za-z0-9*])', '<em>$1</em>')
    $s = [regex]::Replace($s, '~~([^~]+)~~', '<s>$1</s>')
    $s = [regex]::Replace($s, '\[([^\]]+)\]\(([^)]+)\)', '<a href="$2">$1</a>')
    $s = [regex]::Replace($s, "`u{E000}(\d+)`u{E001}", {
        param($m)
        '<code>' + $codes[[int]$m.Groups[1].Value] + '</code>'
    })
    return $s
}

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine(@'
<html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;font-size:11pt}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #c8ccd4;padding:5px 7px;font-size:9pt;vertical-align:top;text-align:left}
th{background:#eceff3;font-weight:bold}
pre{background:#f1f3f4;padding:10px;font-family:"Roboto Mono",monospace;font-size:9pt}
blockquote{border-left:3px solid #9aa0a6;margin-left:0;padding-left:12px;color:#3c4043}
code{font-family:"Roboto Mono",monospace;background:#f1f3f4}
</style></head><body>
'@)

$i = 0
$inList = $null   # 'ul' | 'ol' | $null

function CloseList {
    if ($script:inList) { [void]$script:sb.AppendLine("</$script:inList>"); $script:inList = $null }
}

while ($i -lt $lines.Count) {
    $line = $lines[$i]

    # ---- fenced code block ----
    if ($line -match '^\s*```') {
        CloseList
        $i++
        $buf = @()
        while ($i -lt $lines.Count -and $lines[$i] -notmatch '^\s*```') { $buf += $lines[$i]; $i++ }
        $i++
        [void]$sb.AppendLine('<pre style="background:#f1f3f4;padding:10px;font-family:''Roboto Mono'',monospace;font-size:9pt">' +
            (Esc ($buf -join "`n")) + '</pre>')
        continue
    }

    # ---- table ----
    if ($line -match '^\s*\|' -and ($i + 1) -lt $lines.Count -and $lines[$i+1] -match '^\s*\|[\s:\-\|]+\|\s*$') {
        CloseList
        $header = $line
        $i += 2
        $rows = @()
        while ($i -lt $lines.Count -and $lines[$i] -match '^\s*\|') { $rows += $lines[$i]; $i++ }

        function Cells([string]$row) {
            $t = $row.Trim()
            $t = $t -replace '^\|','' -replace '\|$',''
            return ($t -split '(?<!\\)\|') | ForEach-Object { ($_ -replace '\\\|','|').Trim() }
        }

        [void]$sb.AppendLine('<table border="1" cellpadding="5" cellspacing="0">')
        [void]$sb.Append('<tr>')
        foreach ($c in (Cells $header)) { [void]$sb.Append('<th>' + (Inline $c) + '</th>') }
        [void]$sb.AppendLine('</tr>')
        foreach ($r in $rows) {
            [void]$sb.Append('<tr>')
            foreach ($c in (Cells $r)) { [void]$sb.Append('<td>' + (Inline $c) + '</td>') }
            [void]$sb.AppendLine('</tr>')
        }
        [void]$sb.AppendLine('</table><p></p>')
        continue
    }

    # ---- headings ----
    if ($line -match '^(#{1,6})\s+(.*)$') {
        CloseList
        $lvl = $Matches[1].Length
        $txt = Inline ($Matches[2].Trim())
        if ($lvl -eq 1) { [void]$sb.AppendLine("<h1 style=`"page-break-before:always`">$txt</h1>") }
        else            { [void]$sb.AppendLine("<h$lvl>$txt</h$lvl>") }
        $i++; continue
    }

    # ---- horizontal rule ----
    if ($line -match '^\s*---+\s*$') { CloseList; [void]$sb.AppendLine('<hr>'); $i++; continue }

    # ---- blockquote ----
    if ($line -match '^\s*>\s?(.*)$') {
        CloseList
        $buf = @()
        while ($i -lt $lines.Count -and $lines[$i] -match '^\s*>\s?(.*)$') { $buf += $Matches[1]; $i++ }
        [void]$sb.AppendLine('<blockquote style="border-left:3px solid #9aa0a6;margin-left:0;padding-left:12px;color:#3c4043">' +
            (Inline ($buf -join ' ')) + '</blockquote>')
        continue
    }

    # ---- lists (with wrapped-continuation support, so inline markup that
    #      spans a soft line break is not split across two blocks) ----
    $isUl = $line -match '^\s*[-*]\s+(.*)$'
    $isOl = $false
    if (-not $isUl) { $isOl = $line -match '^\s*\d+\.\s+(.*)$' }
    if ($isUl -or $isOl) {
        $want = if ($isUl) { 'ul' } else { 'ol' }
        if ($inList -ne $want) { CloseList; [void]$sb.AppendLine("<$want>"); $inList = $want }
        $item = @($Matches[1])
        $i++
        while ($i -lt $lines.Count -and
               -not [string]::IsNullOrWhiteSpace($lines[$i]) -and
               $lines[$i] -match '^\s+\S' -and
               $lines[$i] -notmatch '^\s*(\||#{1,6}\s|```|>|[-*]\s|\d+\.\s|---+\s*$)') {
            $item += $lines[$i].Trim(); $i++
        }
        [void]$sb.AppendLine('<li>' + (Inline ($item -join ' ')) + '</li>')
        continue
    }

    # ---- blank / paragraph ----
    if ([string]::IsNullOrWhiteSpace($line)) { CloseList; $i++; continue }

    CloseList
    $buf = @()
    while ($i -lt $lines.Count -and
           -not [string]::IsNullOrWhiteSpace($lines[$i]) -and
           $lines[$i] -notmatch '^\s*(\||#{1,6}\s|```|>|[-*]\s|\d+\.\s|---+\s*$)') {
        $buf += $lines[$i]; $i++
    }
    if ($buf.Count) { [void]$sb.AppendLine('<p>' + (Inline ($buf -join ' ')) + '</p>') }
}
CloseList

[void]$sb.AppendLine('</body></html>')
$sb.ToString() | Set-Content -Encoding UTF8 $Out
Write-Host ("wrote {0} ({1:N1} KB)" -f $Out, ((Get-Item $Out).Length/1KB))
