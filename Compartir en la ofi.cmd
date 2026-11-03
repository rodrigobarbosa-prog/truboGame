@echo off
cd /d "%~dp0"
set HOST=0.0.0.0
echo.
echo Usa este equipo como servidor de la ofi.
echo Comparti con tus companeros la direccion que aparezca como "En la ofi".
echo Todos deben estar en la misma red y usar esa misma direccion.
echo El ranking queda guardado en data\players.json.
echo Deja esta ventana abierta. Ctrl+C para detener.
node server.mjs
pause
