@echo off
echo ========================================
echo   AdRef - Buscador de Referencias
echo ========================================
echo.

cd /d "%~dp0"

echo Iniciando servidor backend...
start "AdRef Backend" cmd /k "node server/index.js"

echo Esperando a que el backend inicie...
timeout /t 3 /nobreak > nul

echo Iniciando frontend...
cd client
start "AdRef Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servidores iniciados!
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo ========================================
echo.
echo Abriendo navegador...
timeout /t 2 /nobreak > nul
start http://localhost:5173

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
echo (Los servidores seguiran corriendo en sus ventanas)
pause > nul
