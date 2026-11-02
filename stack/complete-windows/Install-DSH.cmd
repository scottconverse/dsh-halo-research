@echo off
setlocal
set "DSH_PWSH=%ProgramFiles%\PowerShell\7\pwsh.exe"
if exist "%DSH_PWSH%" goto run
for /f "delims=" %%P in ('where pwsh.exe 2^>nul') do if not exist "%DSH_PWSH%" set "DSH_PWSH=%%P"
if exist "%DSH_PWSH%" goto run
echo Installing PowerShell 7 using the normal Windows package installer.
winget install --id Microsoft.PowerShell --exact --source winget --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto failed
set "DSH_PWSH=%ProgramFiles%\PowerShell\7\pwsh.exe"
if not exist "%DSH_PWSH%" goto failed
:run
"%DSH_PWSH%" -NoLogo -NoProfile -File "%~dp0Install-DSH.ps1" %*
exit /b %errorlevel%
:failed
echo PowerShell setup did not finish. Install PowerShell 7 normally, then run this command again.
exit /b 1
