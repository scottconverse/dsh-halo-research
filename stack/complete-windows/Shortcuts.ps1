$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$folder=Join-Path ([Environment]::GetFolderPath('Desktop')) 'DSH Complete'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$shell=New-Object -ComObject WScript.Shell
foreach($row in @(@{name='DSH Desktop';action='Desktop'},@{name='Start DSH Web';action='Web'},@{name='Stop DSH + Wigolo';action='Stop'})) {
    $file=Join-Path $folder ($row.name+'.lnk')
    $exists=Test-Path -LiteralPath $file
    $shortcut=$shell.CreateShortcut($file)
    $target=Join-Path $PSHOME 'pwsh.exe'
    if (-not (Test-Path -LiteralPath $target)) { throw 'Create shortcuts from PowerShell 7.' }
    $arguments='-NoLogo -NoProfile -File "'+(Join-Path $root 'Control-DSH.ps1')+'" -Action '+$row.action
    if ($exists) {
        if ($shortcut.TargetPath -ne $target -or $shortcut.Arguments -ne $arguments -or $shortcut.WorkingDirectory -ne $root) { throw "Unrelated shortcut already exists; no overwrite: $file" }
        continue # Resume only our byte-equivalent shortcut target/action.
    }
    $shortcut.TargetPath=$target
    $shortcut.Arguments=$arguments
    $shortcut.WorkingDirectory=$root
    $shortcut.Save()
}
