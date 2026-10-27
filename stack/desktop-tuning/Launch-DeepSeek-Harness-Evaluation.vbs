Option Explicit
Dim shell, env, fso, exePath, helperPath, catalogPath, pwshPath, result, logPath, logDir
Set shell = CreateObject("WScript.Shell")
Set env = shell.Environment("PROCESS")
Set fso = CreateObject("Scripting.FileSystemObject")
env("DSH_HOME") = "C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval\home"
helperPath = "C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval\Select-Resident-Desktop-Model.ps1"
catalogPath = "C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval\Refresh-Desktop-Model-Catalog.ps1"
pwshPath = "C:\Program Files\PowerShell\7\pwsh.exe"
logDir = env("DSH_HOME") & "\logs"
If Not fso.FolderExists(logDir) Then fso.CreateFolder logDir
logPath = fso.BuildPath(logDir, "desktop-startup.log")
AppendLog "Desktop launch requested."

' Discovery is optional: failure must not discard the saved catalog or block
' the application. The separate selected-route safety check stays mandatory.
result = RunLogged(catalogPath)
If result <> 0 Then
    AppendLog "Catalog refresh failed; keeping the saved catalog and continuing to the model safety check."
End If
result = RunLogged(helperPath)
If result <> 0 Then
    AppendLog "Model safety check failed; Desktop was not started."
    MsgBox "DSH could not complete its model safety check. Your settings were left in place. Details: " & logPath, vbExclamation, "DSH Halo Desktop"
    WScript.Quit result
End If
exePath = "C:\Users\scott\AppData\Local\Programs\DeepSeek Harness\DeepSeek Harness.exe"
shell.CurrentDirectory = "C:\Users\scott\AppData\Local\Programs\DeepSeek Harness"
AppendLog "Model safety check passed; opening Desktop."
shell.Run Chr(34) & exePath & Chr(34), 1, False

Function PsLiteral(value)
    PsLiteral = "'" & Replace(value, "'", "''") & "'"
End Function

Function RunLogged(scriptPath)
    Dim command
    command = "$ErrorActionPreference='Stop'; try { & " & PsLiteral(scriptPath) & " *>> " & PsLiteral(logPath) & "; exit 0 } catch { $_ | Out-String | Add-Content -LiteralPath " & PsLiteral(logPath) & "; exit 1 }"
    RunLogged = shell.Run(Chr(34) & pwshPath & Chr(34) & " -NoProfile -Command " & Chr(34) & command & Chr(34), 0, True)
End Function

Sub AppendLog(message)
    Dim logFile
    Set logFile = fso.OpenTextFile(logPath, 8, True)
    logFile.WriteLine Now & " " & message
    logFile.Close
End Sub
