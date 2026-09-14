Set-StrictMode -Version Latest

if (-not ('Halo.WindowsCommandLine' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace Halo {
    public static class WindowsCommandLine {
        [DllImport("shell32.dll", SetLastError = true)]
        private static extern IntPtr CommandLineToArgvW(
            [MarshalAs(UnmanagedType.LPWStr)] string commandLine,
            out int argc
        );

        [DllImport("kernel32.dll")]
        private static extern IntPtr LocalFree(IntPtr memory);

        public static string[] Parse(string commandLine) {
            if (String.IsNullOrWhiteSpace(commandLine)) return Array.Empty<string>();
            int count;
            IntPtr values = CommandLineToArgvW(commandLine, out count);
            if (values == IntPtr.Zero) {
                throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            }
            try {
                string[] result = new string[count];
                for (int index = 0; index < count; index++) {
                    IntPtr value = Marshal.ReadIntPtr(values, index * IntPtr.Size);
                    result[index] = Marshal.PtrToStringUni(value);
                }
                return result;
            } finally {
                LocalFree(values);
            }
        }
    }
}
'@
}

function Get-ProcessArgumentVector([object] $Process) {
    if (-not $Process -or [string]::IsNullOrWhiteSpace([string]$Process.CommandLine)) {
        return @()
    }
    return @([Halo.WindowsCommandLine]::Parse([string]$Process.CommandLine))
}

function Test-ExactProcessCommand(
    [object] $Process,
    [string] $ExecutablePath,
    [string[]] $Arguments
) {
    if (-not $Process -or [string]::IsNullOrWhiteSpace([string]$Process.ExecutablePath)) {
        return $false
    }

    $expectedExecutable = [IO.Path]::GetFullPath($ExecutablePath)
    $actualExecutable = [IO.Path]::GetFullPath([string]$Process.ExecutablePath)
    if (-not [StringComparer]::OrdinalIgnoreCase.Equals($actualExecutable, $expectedExecutable)) {
        return $false
    }

    $argv = @(Get-ProcessArgumentVector $Process)
    if ($argv.Count -ne $Arguments.Count + 1) { return $false }
    try { $actualArgvExecutable = [IO.Path]::GetFullPath([string]$argv[0]) }
    catch { return $false }
    if (-not [StringComparer]::OrdinalIgnoreCase.Equals($actualArgvExecutable, $expectedExecutable)) {
        return $false
    }

    for ($index = 0; $index -lt $Arguments.Count; $index++) {
        $actual = [string]$argv[$index + 1]
        $expected = [string]$Arguments[$index]
        if ($index -eq 0 -and [IO.Path]::IsPathFullyQualified($expected)) {
            try {
                if (-not [StringComparer]::OrdinalIgnoreCase.Equals(
                    [IO.Path]::GetFullPath($actual),
                    [IO.Path]::GetFullPath($expected)
                )) { return $false }
            } catch { return $false }
        } elseif (-not [StringComparer]::Ordinal.Equals($actual, $expected)) {
            return $false
        }
    }
    return $true
}

function Stop-IdentityCheckedProcess([object] $Candidate, [string] $Description) {
    $live = Get-CimInstance Win32_Process -Filter "ProcessId=$($Candidate.ProcessId)" -ErrorAction SilentlyContinue
    if (-not $live) { return $false }
    if ($live.CreationDate -ne $Candidate.CreationDate -or
        $live.ExecutablePath -ne $Candidate.ExecutablePath -or
        $live.CommandLine -ne $Candidate.CommandLine) {
        throw "Refusing to stop $Description because PID $($Candidate.ProcessId) was reused or its identity changed."
    }
    Stop-Process -Id $live.ProcessId -Force -ErrorAction Stop
    return $true
}

function Get-ProcessDescendants([int] $RootProcessId, [object[]] $ProcessSnapshot) {
    $result = [Collections.Generic.List[object]]::new()
    $pending = [Collections.Generic.Queue[int]]::new()
    $seen = [Collections.Generic.HashSet[int]]::new()
    $pending.Enqueue($RootProcessId)
    $null = $seen.Add($RootProcessId)
    while ($pending.Count -gt 0) {
        $parent = $pending.Dequeue()
        foreach ($process in @($ProcessSnapshot | Where-Object { [int]$_.ParentProcessId -eq $parent })) {
            $pidValue = [int]$process.ProcessId
            if ($seen.Add($pidValue)) {
                $result.Add($process)
                $pending.Enqueue($pidValue)
            }
        }
    }
    return @($result)
}
