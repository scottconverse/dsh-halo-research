<#
  Halo-Console.ps1 — the OPERATOR surface. Point and click only; no commands.

  Scott never types a CLI. This window is how he drives the Halo Stack:
  pick a project, say what to build, click Build. Halo-Code.ps1 remains the
  machine-facing API that cloud coordinators call - this is the human face of
  the same thing.
#>
Add-Type -AssemblyName PresentationFramework, System.Windows.Forms
$ErrorActionPreference = 'Stop'
$stack = $PSScriptRoot
$settingsPath = Join-Path $stack 'halo-console-settings.json'

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="Halo Console" Height="760" Width="1020" WindowStartupLocation="CenterScreen"
        Background="#1B1D23">
  <Window.Resources>
    <Style TargetType="TextBlock"><Setter Property="Foreground" Value="#E6E8EC"/><Setter Property="FontFamily" Value="Segoe UI"/></Style>
    <Style TargetType="Label"><Setter Property="Foreground" Value="#9AA3B2"/><Setter Property="FontFamily" Value="Segoe UI"/><Setter Property="FontSize" Value="12"/></Style>
    <Style TargetType="TextBox">
      <Setter Property="Background" Value="#252932"/><Setter Property="Foreground" Value="#E6E8EC"/>
      <Setter Property="BorderBrush" Value="#3A404D"/><Setter Property="Padding" Value="6"/>
      <Setter Property="FontFamily" Value="Consolas"/><Setter Property="FontSize" Value="12"/>
    </Style>
    <Style TargetType="Button">
      <Setter Property="Background" Value="#2F80ED"/><Setter Property="Foreground" Value="White"/>
      <Setter Property="BorderThickness" Value="0"/><Setter Property="Padding" Value="14,8"/>
      <Setter Property="FontFamily" Value="Segoe UI"/><Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="Margin" Value="0,0,8,0"/><Setter Property="Cursor" Value="Hand"/>
    </Style>
  </Window.Resources>
  <Grid Margin="16">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <StackPanel Grid.Row="0" Orientation="Horizontal" Margin="0,0,0,14">
      <TextBlock Text="Halo Console" FontSize="22" FontWeight="Bold"/>
      <TextBlock Name="SubTitle" Text="   local models do the coding - the gate decides when it is done"
                 FontSize="12" Foreground="#7C8698" VerticalAlignment="Bottom" Margin="0,0,0,3"/>
    </StackPanel>

    <Grid Grid.Row="1" Margin="0,0,0,10">
      <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
      <StackPanel Grid.Column="0">
        <Label Content="PROJECT FOLDER (must be a git repository)"/>
        <TextBox Name="RepoBox"/>
      </StackPanel>
      <Button Name="BrowseRepo" Grid.Column="1" Content="Browse..." VerticalAlignment="Bottom" Margin="8,0,0,0" Background="#3A404D"/>
    </Grid>

    <Grid Grid.Row="2" Margin="0,0,0,10">
      <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
      <StackPanel Grid.Column="0">
        <Label Content="WHAT TO BUILD  (plain instructions for the local model - or load a brief file)"/>
        <TextBox Name="BriefBox" Height="130" AcceptsReturn="True" TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"/>
      </StackPanel>
      <StackPanel Grid.Column="1" VerticalAlignment="Bottom" Margin="8,0,0,0">
        <Button Name="LoadBrief" Content="Load brief..." Background="#3A404D" Margin="0,0,0,6"/>
        <Button Name="SaveBrief" Content="Save brief..." Background="#3A404D"/>
      </StackPanel>
    </Grid>

    <Grid Grid.Row="3" Margin="0,0,0,10">
      <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="8"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
      <StackPanel Grid.Column="0">
        <Label Content="HOW TO TEST IT  (any command; passing = done)"/>
        <TextBox Name="VerifyBox"/>
        <StackPanel Orientation="Horizontal" Margin="0,6,0,0">
          <Button Name="PresetPy" Content="pytest" Background="#3A404D" FontWeight="Normal" Padding="10,4"/>
          <Button Name="PresetNpm" Content="npm test" Background="#3A404D" FontWeight="Normal" Padding="10,4"/>
          <Button Name="PresetCargo" Content="cargo test" Background="#3A404D" FontWeight="Normal" Padding="10,4"/>
          <Button Name="PresetGo" Content="go test" Background="#3A404D" FontWeight="Normal" Padding="10,4"/>
        </StackPanel>
      </StackPanel>
      <StackPanel Grid.Column="2">
        <Label Content="SPEC FILES THE MODEL MAY NOT EDIT  (your tests; space separated)"/>
        <TextBox Name="FrozenBox"/>
        <TextBlock Text="Leave blank only if you have no tests of your own. This is what stops a fake pass."
                   Foreground="#7C8698" FontSize="11" TextWrapping="Wrap" Margin="0,6,0,0"/>
      </StackPanel>
    </Grid>

    <Grid Grid.Row="4" Margin="0,4,0,12">
      <Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
      <StackPanel Grid.Column="0" Orientation="Horizontal">
        <Button Name="BuildBtn" Content="BUILD IT" FontSize="14" Padding="22,10"/>
        <Button Name="ProveBtn" Content="Prove the stack" Background="#3A404D"/>
        <Button Name="StopBtn" Content="Stop" Background="#8B3A3A" IsEnabled="False"/>
      </StackPanel>
      <StackPanel Grid.Column="2" Orientation="Horizontal">
        <Label Content="minutes per try" VerticalAlignment="Center"/>
        <TextBox Name="CapBox" Text="15" Width="42" TextAlignment="Center" Margin="6,0,14,0"/>
        <Label Content="tries" VerticalAlignment="Center"/>
        <TextBox Name="RoundsBox" Text="2" Width="42" TextAlignment="Center" Margin="6,0,0,0"/>
      </StackPanel>
    </Grid>

    <Border Grid.Row="5" Background="#14161B" BorderBrush="#3A404D" BorderThickness="1" Padding="10">
      <ScrollViewer Name="LogScroll" VerticalScrollBarVisibility="Auto">
        <TextBlock Name="LogBox" FontFamily="Consolas" FontSize="12" Foreground="#B9C0CC" TextWrapping="Wrap"/>
      </ScrollViewer>
    </Border>

    <Border Grid.Row="6" Name="StatusBar" Background="#252932" Padding="12,10" Margin="0,12,0,0">
      <TextBlock Name="StatusText" Text="Ready. Pick a project, say what to build, then click BUILD IT."
                 FontSize="14" FontWeight="SemiBold"/>
    </Border>
  </Grid>
</Window>
'@

$win = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
$ui = @{}
'RepoBox','BrowseRepo','BriefBox','LoadBrief','SaveBrief','VerifyBox','FrozenBox','PresetPy','PresetNpm',
'PresetCargo','PresetGo','BuildBtn','ProveBtn','StopBtn','CapBox','RoundsBox','LogBox','LogScroll',
'StatusBar','StatusText' | ForEach-Object { $ui[$_] = $win.FindName($_) }

# ---------- state ----------
$script:proc = $null
$script:logFile = $null
$script:logPos = 0
$script:mode = 'idle'

function Set-Status($text, $color) {
    $ui.StatusText.Text = $text
    $ui.StatusBar.Background = [Windows.Media.BrushConverter]::new().ConvertFrom($color)
}
function Add-Log($text) {
    $ui.LogBox.Text += ($text + "`n")
    $ui.LogScroll.ScrollToEnd()
}

# ---------- settings ----------
if (Test-Path $settingsPath) {
    try {
        $s = Get-Content $settingsPath -Raw | ConvertFrom-Json
        $ui.RepoBox.Text = $s.repo; $ui.VerifyBox.Text = $s.verify
        $ui.FrozenBox.Text = $s.frozen; $ui.BriefBox.Text = $s.brief
        if ($s.cap) { $ui.CapBox.Text = $s.cap }; if ($s.rounds) { $ui.RoundsBox.Text = $s.rounds }
    } catch { }
}
function Save-Settings {
    @{ repo = $ui.RepoBox.Text; verify = $ui.VerifyBox.Text; frozen = $ui.FrozenBox.Text
       brief = $ui.BriefBox.Text; cap = $ui.CapBox.Text; rounds = $ui.RoundsBox.Text } |
        ConvertTo-Json | Set-Content $settingsPath
}

# ---------- pickers ----------
$ui.BrowseRepo.Add_Click({
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    $dlg.Description = 'Pick the project folder (a git repository)'
    if ($ui.RepoBox.Text -and (Test-Path $ui.RepoBox.Text)) { $dlg.SelectedPath = $ui.RepoBox.Text }
    if ($dlg.ShowDialog() -eq 'OK') { $ui.RepoBox.Text = $dlg.SelectedPath }
})
$ui.LoadBrief.Add_Click({
    $dlg = New-Object System.Windows.Forms.OpenFileDialog
    $dlg.Filter = 'Brief files (*.md;*.txt)|*.md;*.txt|All files (*.*)|*.*'
    $dlg.InitialDirectory = Join-Path $stack 'gateway-conductor\briefs'
    if ($dlg.ShowDialog() -eq 'OK') { $ui.BriefBox.Text = Get-Content $dlg.FileName -Raw }
})
$ui.SaveBrief.Add_Click({
    $dlg = New-Object System.Windows.Forms.SaveFileDialog
    $dlg.Filter = 'Markdown (*.md)|*.md'; $dlg.InitialDirectory = Join-Path $stack 'gateway-conductor\briefs'
    if ($dlg.ShowDialog() -eq 'OK') { Set-Content $dlg.FileName $ui.BriefBox.Text; Add-Log "saved brief: $($dlg.FileName)" }
})
$ui.PresetPy.Add_Click({ $ui.VerifyBox.Text = 'uv run --frozen python -m pytest -q tests/' })
$ui.PresetNpm.Add_Click({ $ui.VerifyBox.Text = 'npm test' })
$ui.PresetCargo.Add_Click({ $ui.VerifyBox.Text = 'cargo test' })
$ui.PresetGo.Add_Click({ $ui.VerifyBox.Text = 'go test ./...' })

# ---------- runner ----------
function Start-Run([string[]]$argList, [string]$what) {
    $script:logFile = Join-Path $env:TEMP ("halo-console-" + (Get-Date -Format 'HHmmss') + '.log')
    '' | Set-Content $script:logFile
    $script:logPos = 0
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = (Get-Command pwsh).Source
    $psi.Arguments = $argList -join ' '
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $script:proc = [Diagnostics.Process]::Start($psi)
    $lf = $script:logFile
    Register-ObjectEvent -InputObject $script:proc -EventName OutputDataReceived -Action {
        if ($EventArgs.Data) { Add-Content $Event.MessageData $EventArgs.Data }
    } -MessageData $lf | Out-Null
    Register-ObjectEvent -InputObject $script:proc -EventName ErrorDataReceived -Action {
        if ($EventArgs.Data) { Add-Content $Event.MessageData $EventArgs.Data }
    } -MessageData $lf | Out-Null
    $script:proc.BeginOutputReadLine(); $script:proc.BeginErrorReadLine()
    $ui.BuildBtn.IsEnabled = $false; $ui.ProveBtn.IsEnabled = $false; $ui.StopBtn.IsEnabled = $true
    Set-Status "$what running - this window stays live; output appears below." '#2F80ED'
}

$timer = New-Object Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(700)
$timer.Add_Tick({
    if ($script:logFile -and (Test-Path $script:logFile)) {
        $lines = @(Get-Content $script:logFile -EA SilentlyContinue)
        if ($lines.Count -gt $script:logPos) {
            $lines[$script:logPos..($lines.Count - 1)] | ForEach-Object { Add-Log $_ }
            $script:logPos = $lines.Count
        }
    }
    if ($script:proc -and $script:proc.HasExited) {
        $code = $script:proc.ExitCode
        $script:proc = $null
        $ui.BuildBtn.IsEnabled = $true; $ui.ProveBtn.IsEnabled = $true; $ui.StopBtn.IsEnabled = $false
        if ($script:mode -eq 'prove') {
            if ($code -eq 0) { Set-Status 'THE STACK IS WORKING - every check passed.' '#2E7D32' }
            else { Set-Status "Stack proof: $code check(s) FAILED - see the log above." '#B23C3C' }
        } else {
            switch ($code) {
                0 { Set-Status 'DONE - the tests pass and the work is committed.' '#2E7D32' }
                2 { Set-Status 'THE STACK ITSELF IS BROKEN (not your project). Click "Prove the stack".' '#B23C3C' }
                3 { Set-Status 'STOPPED EARLY - two identical failures. The job is too big; split it.' '#B26B00' }
                default { Set-Status 'NOT DONE - the tests still fail. The log shows what failed.' '#B26B00' }
            }
        }
        $script:mode = 'idle'
    }
})
$timer.Start()

# ---------- buttons ----------
$ui.ProveBtn.Add_Click({
    $ui.LogBox.Text = ''
    $script:mode = 'prove'
    Start-Run @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$(Join-Path $stack 'Prove-Halo.ps1')`"") 'Stack proof'
})

$ui.BuildBtn.Add_Click({
    if (-not $ui.RepoBox.Text -or -not (Test-Path $ui.RepoBox.Text)) {
        Set-Status 'Pick a project folder first (click Browse).' '#B23C3C'; return
    }
    if (-not (Test-Path (Join-Path $ui.RepoBox.Text '.git'))) {
        Set-Status 'That folder is not a git repository. The stack needs one so it can undo failed work.' '#B23C3C'; return
    }
    if (-not $ui.BriefBox.Text.Trim()) { Set-Status 'Say what to build in the big box.' '#B23C3C'; return }
    if (-not $ui.VerifyBox.Text.Trim()) { Set-Status 'Give a test command - it is how the stack knows it is done.' '#B23C3C'; return }
    Save-Settings
    $ui.LogBox.Text = ''
    $script:mode = 'build'

    $briefFile = Join-Path $env:TEMP ("halo-brief-" + (Get-Date -Format 'HHmmss') + '.md')
    Set-Content $briefFile $ui.BriefBox.Text
    $a = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$(Join-Path $stack 'Halo-Code.ps1')`"",
           '-Repo',"`"$($ui.RepoBox.Text)`"", '-Brief',"`"$briefFile`"", '-Verify',"`"$($ui.VerifyBox.Text)`"",
           '-Name','console', '-CapMin',$ui.CapBox.Text, '-Rounds',$ui.RoundsBox.Text, '-Commit')
    if ($ui.FrozenBox.Text.Trim()) {
        $q = ($ui.FrozenBox.Text.Trim() -split '\s+' | ForEach-Object { "`"$_`"" }) -join ','
        $a += @('-Frozen', $q)
    }
    Add-Log "project : $($ui.RepoBox.Text)"
    Add-Log "test    : $($ui.VerifyBox.Text)"
    if ($ui.FrozenBox.Text.Trim()) { Add-Log "protected: $($ui.FrozenBox.Text)" }
    Add-Log ''
    Start-Run $a 'Build'
})

$ui.StopBtn.Add_Click({
    if ($script:proc) {
        Add-Log '--- stopping (killing the worker process tree) ---'
        & taskkill /PID $script:proc.Id /T /F *> $null
        Set-Status 'Stopped by you. Nothing is left running.' '#B26B00'
    }
})

$win.Add_Closing({ Save-Settings; if ($script:proc) { & taskkill /PID $script:proc.Id /T /F *> $null } })
$win.ShowDialog() | Out-Null
