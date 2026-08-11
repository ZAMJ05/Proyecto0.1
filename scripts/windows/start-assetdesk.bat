@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM AssetDesk - arranque en red local (manual o automatico)
REM NUNCA ejecuta seed (no borra datos).
REM ============================================================

set "APP_DIR=%~dp0..\.."
for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"

set "PORT=3000"
set "LOG_DIR=%APP_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\assetdesk-startup.log"
set "DB_FILE=%APP_DIR%\data\assetdesk.db"
set "NODE_EXE="
set "NPM_CMD="

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%APP_DIR%\data" mkdir "%APP_DIR%\data"

echo.>> "%LOG_FILE%"
echo ===== AssetDesk start %date% %time% =====>> "%LOG_FILE%"
echo APP_DIR=%APP_DIR%>> "%LOG_FILE%"
echo DB_FILE=%DB_FILE%>> "%LOG_FILE%"
echo USERNAME=%USERNAME%>> "%LOG_FILE%"

cd /d "%APP_DIR%"
if errorlevel 1 (
  echo ERROR: No se pudo entrar a "%APP_DIR%">> "%LOG_FILE%"
  exit /b 1
)

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
  set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
)
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
  set "NODE_EXE=%LOCALAPPDATA%\Programs\node\node.exe"
  set "NPM_CMD=%LOCALAPPDATA%\Programs\node\npm.cmd"
)
if not defined NODE_EXE if exist "%NVM_SYMLINK%\node.exe" (
  set "NODE_EXE=%NVM_SYMLINK%\node.exe"
  set "NPM_CMD=%NVM_SYMLINK%\npm.cmd"
)
if not defined NODE_EXE (
  for /f "delims=" %%P in ('where node 2^>nul') do (
    if not defined NODE_EXE set "NODE_EXE=%%P"
  )
)
if not defined NPM_CMD (
  for /f "delims=" %%P in ('where npm.cmd 2^>nul') do (
    if not defined NPM_CMD set "NPM_CMD=%%P"
  )
)
if not defined NPM_CMD if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"

if not defined NODE_EXE (
  echo ERROR: No se encontro node.exe>> "%LOG_FILE%"
  exit /b 1
)
if not defined NPM_CMD (
  echo ERROR: No se encontro npm.cmd>> "%LOG_FILE%"
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

echo NODE_EXE=%NODE_EXE%>> "%LOG_FILE%"
"%NODE_EXE%" -v >> "%LOG_FILE%" 2>&1
call "%NPM_CMD%" -v >> "%LOG_FILE%" 2>&1

REM Fija .env con ruta ABSOLUTA a data\assetdesk.db y migra db antigua si aplica
call "%NPM_CMD%" run env:init >> "%LOG_FILE%" 2>&1

REM Solo crea esquema si no existe la BD. NUNCA seed.
if not exist "%DB_FILE%" (
  echo BD no existe. Inicializando SIN borrar datos ^(db:init^)...>> "%LOG_FILE%"
  call "%NPM_CMD%" run db:init >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    echo ERROR: db:init fallo>> "%LOG_FILE%"
    exit /b 1
  )
) else (
  echo BD existente detectada. Se conserva.>> "%LOG_FILE%"
  REM Asegura esquema al dia sin tocar filas
  call "%NPM_CMD%" run db:push >> "%LOG_FILE%" 2>&1
)

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo INFO: El puerto %PORT% ya esta en uso. Se omite el arranque.>> "%LOG_FILE%"
  exit /b 0
)

if not exist "%APP_DIR%\node_modules\" (
  echo Instalando dependencias...>> "%LOG_FILE%"
  call "%NPM_CMD%" install >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    echo ERROR: npm install fallo>> "%LOG_FILE%"
    exit /b 1
  )
)

if not exist "%APP_DIR%\.next\BUILD_ID" (
  echo Compilando app...>> "%LOG_FILE%"
  call "%NPM_CMD%" run build >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    echo ERROR: build fallo>> "%LOG_FILE%"
    exit /b 1
  )
)

echo Iniciando AssetDesk. DB=%DB_FILE%>> "%LOG_FILE%"
call "%NPM_CMD%" run start:lan >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"
echo AssetDesk finalizo con codigo %EXIT_CODE% a las %date% %time%>> "%LOG_FILE%"
exit /b %EXIT_CODE%
