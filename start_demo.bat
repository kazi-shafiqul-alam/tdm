@echo off
cd /d "%~dp0"
echo Starting Tour de Mars local demo server...
start "Tour de Mars server" cmd /k "python -m http.server 8080"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/marswalk.html?demo=1"
echo If the browser cannot connect, check that Python is installed and refresh the page.
