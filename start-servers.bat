@echo off
echo Starting TeachWise servers...

echo Starting backend server...
start "Backend Server" cmd /k "cd /d C:\Users\Krishnapriya\Downloads\teachwise-mvp && node .\backend\index.js"

timeout /t 3 /nobreak

echo Starting frontend server...
start "Frontend Server" cmd /k "cd /d C:\Users\Krishnapriya\Downloads\teachwise-mvp\frontend && npm run dev"

echo Both servers starting in separate windows...
echo Backend: http://localhost:3003
echo Frontend: http://localhost:3000
echo Admin Panel: http://localhost:3000/admin
pause