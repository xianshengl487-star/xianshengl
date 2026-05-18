@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Dependencies are missing. Run npm install first.
  pause
  exit /b 1
)
echo Building BlockForge Studio...
call node_modules\.bin\tsc.cmd --noEmit || exit /b 1
call node_modules\.bin\tsc.cmd -p tsconfig.main.json || exit /b 1
call node_modules\.bin\vite.cmd build || exit /b 1
start "" "node_modules\electron\dist\electron.exe" .
