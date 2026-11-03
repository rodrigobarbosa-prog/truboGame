@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js para ejecutar este proyecto.
  pause
  exit /b 1
)
echo.
echo Abri http://localhost:4173 en tu navegador.
echo Deja esta ventana abierta mientras jugas. Ctrl+C para detener.
node server.mjs
pause
