@echo off
setlocal

set "scriptDir=%~dp0"
if not defined scriptDir (
	echo Unable to resolve script directory.
	pause
	exit /b 1
)

pushd "%scriptDir%backend" || goto :error

echo Installing backend dependencies (if needed)...
call npm install >nul 2>&1

echo Launching TeachWise backend on port 3001...
node index.js
pause
popd
exit /b 0

:error
echo Failed to locate backend folder. Ensure the repository structure matches expectations.
pause
exit /b 1

