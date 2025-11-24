@echo off
setlocal

echo Starting TeachWise servers...

set "scriptDir=%~dp0"
if not defined scriptDir (
	echo Unable to resolve script directory.
	pause
	exit /b 1
)

set "backendDir=%scriptDir%backend"
set "frontendDir=%scriptDir%frontend"

if not exist "%backendDir%" (
	echo Backend directory not found at "%backendDir%"
	pause
	exit /b 1
)

if not exist "%frontendDir%" (
	echo Frontend directory not found at "%frontendDir%"
	pause
	exit /b 1
)

echo Installing backend dependencies (if needed)...
pushd "%backendDir%"
call npm install >nul 2>&1
popd

echo Installing frontend dependencies (if needed)...
pushd "%frontendDir%"
call npm install >nul 2>&1
popd

echo Starting backend server window...
start "TeachWise Backend" cmd /k "cd /d ""%backendDir%"" && node index.js"

timeout /t 3 /nobreak >nul

echo Starting frontend server window...
start "TeachWise Frontend" cmd /k "cd /d ""%frontendDir%"" && npm run dev"

echo Backend running on http://localhost:3001
echo Frontend running on http://localhost:3000
echo Admin Panel available at http://localhost:3000/admin
echo Servers launching in separate windows. Press any key to exit this helper.
pause
exit /b 0

