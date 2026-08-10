@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM AssetDesk - arranque en red local (manual o automatico)
REM ============================================================

set "APP_DIR=%~dp0..\.."
for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"

set "PORT=3000"
set "LOG_DIR=%APP_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\assetdesk-startup.log"
set "NODE_EXE="
set "NPM_CMD="

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo.>> "%LOG_FILE%"
echo ===== AssetDesk start %date% %time% =====>> "%LOG_FILE%"
echo APP_DIR=%APP_DIR%>> "%LOG_FILE%"
echo USERNAME=%USERNAME%>> "%LOG_FILE%"
echo USERPROFILE=%USERPROFILE%>> "%LOG_FILE%"
echo CD inicial=%CD%>> "%LOG_FILE%"

cd /d "%APP_DIR%"
if errorlevel 1 (
  echo ERROR: No se pudo entrar a "%APP_DIR%">> "%LOG_FILE%"
  exit /b 1
)

REM --- Buscar Node/npm en rutas tipicas (Task Scheduler no carga PATH de usuario) ---
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
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)

REM Ultimo recurso: where
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
  echo Instala Node.js LTS y vuelve a ejecutar install-autostart.ps1>> "%LOG_FILE%"
  exit /b 1
)
if not defined NPM_CMD (
  echo ERROR: No se encontro npm.cmd>> "%LOG_FILE%"
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

echo NODE_EXE=%NODE_EXE%>> "%LOG_FILE%"
echo NPM_CMD=%NPM_CMD%>> "%LOG_FILE%"
"%NODE_EXE%" -v >> "%LOG_FILE%" 2>&1
call "%NPM_CMD%" -v >> "%LOG_FILE%" 2>&1

if not exist "%APP_DIR%\.env" (
  if exist "%APP_DIR%\.env.example" (
    echo Creando .env desde .env.example>> "%LOG_FILE%"
    copy /Y "%APP_DIR%\.env.example" "%APP_DIR%\.env" >> "%LOG_FILE%" 2>&1
  ) else (
    echo ERROR: Falta .env y .env.example>> "%LOG_FILE%"
    exit /b 1
  )
)

REM ¿Ya esta corriendo?
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

if not exist "%APP_DIR%\prisma\dev.db" (
  echo Preparando base de datos...>> "%LOG_FILE%"
  call "%NPM_CMD%" run db:setup >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    echo ERROR: db:setup fallo>> "%LOG_FILE%"
    exit /b 1
  )
)

if not exist "%APP_DIR%\.next\BUILD_ID" (
  echo Compilando app ^(puede tardar^)...>> "%LOG_FILE%"
  call "%NPM_CMD%" run build >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    echo ERROR: build fallo>> "%LOG_FILE%"
    exit /b 1
  )
)

echo Iniciando AssetDesk en 0.0.0.0:%PORT% ...>> "%LOG_FILE%"
echo URL local: http://localhost:%PORT%>> "%LOG_FILE%"

REM Mantener proceso vivo; salida al log
call "%NPM_CMD%" run start:lan >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"
echo AssetDesk finalizo con codigo %EXIT_CODE% a las %date% %time%>> "%LOG_FILE%"
exit /b %EXIT_CODE%
