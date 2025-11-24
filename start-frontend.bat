@echo off
setlocal

set "scriptDir=%~dp0"
if not defined scriptDir (
	echo Unable to resolve script directory.
	pause
	exit /b 1
)

pushd "%scriptDir%frontend" || goto :error

echo Installing frontend dependencies (if needed)...
call npm install >nul 2>&1

echo Starting TeachWise frontend on http://localhost:3000 ...
npm run dev
pause
popd
exit /b 0

:error
echo Failed to locate frontend folder. Ensure the repository structure matches expectations.
pause
exit /b 1

