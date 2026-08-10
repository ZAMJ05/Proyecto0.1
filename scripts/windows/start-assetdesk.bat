@echo off
setlocal EnableExtensions

REM ============================================================
REM AssetDesk - arranque automatico en red local
REM ============================================================

set "APP_DIR=%~dp0..\.."
for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"

set "PORT=3000"
set "LOG_DIR=%APP_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\assetdesk-startup.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ===== AssetDesk start %date% %time% =====>> "%LOG_FILE%"
echo APP_DIR=%APP_DIR%>> "%LOG_FILE%"
echo USERPROFILE=%USERPROFILE%>> "%LOG_FILE%"

cd /d "%APP_DIR%"
if errorlevel 1 (
  echo ERROR: No se pudo entrar a %APP_DIR%>> "%LOG_FILE%"
  exit /b 1
)

REM Ampliar PATH tipico de Node cuando el Task Scheduler no lo carga
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
if exist "%APPDATA%\nvm" set "PATH=%APPDATA%\nvm;%PATH%"
if exist "%NVM_HOME%" set "PATH=%NVM_HOME%;%PATH%"
if exist "%NVM_SYMLINK%" set "PATH=%NVM_SYMLINK%;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta en el PATH de esta sesion.>> "%LOG_FILE%"
  echo Instala Node o agrega node.exe al PATH del sistema.>> "%LOG_FILE%"
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm no esta en el PATH de esta sesion.>> "%LOG_FILE%"
  exit /b 1
)

node -v >> "%LOG_FILE%" 2>&1
npm -v >> "%LOG_FILE%" 2>&1

if not exist "%APP_DIR%\.env" (
  if exist "%APP_DIR%\.env.example" (
    copy /Y "%APP_DIR%\.env.example" "%APP_DIR%\.env" >> "%LOG_FILE%" 2>&1
  )
)

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo Ya hay un proceso en el puerto %PORT%. Se omite el arranque.>> "%LOG_FILE%"
  exit /b 0
)

if not exist "%APP_DIR%\node_modules" (
  echo Instalando dependencias...>> "%LOG_FILE%"
  call npm.cmd install >> "%LOG_FILE%" 2>&1
)

if not exist "%APP_DIR%\prisma\dev.db" (
  echo Preparando base de datos...>> "%LOG_FILE%"
  call npm.cmd run db:setup >> "%LOG_FILE%" 2>&1
)

if not exist "%APP_DIR%\.next\BUILD_ID" (
  echo Compilando app...>> "%LOG_FILE%"
  call npm.cmd run build >> "%LOG_FILE%" 2>&1
)

echo Iniciando AssetDesk en 0.0.0.0:%PORT% ...>> "%LOG_FILE%"
call npm.cmd run start:lan >> "%LOG_FILE%" 2>&1

echo AssetDesk finalizo con codigo %ERRORLEVEL%>> "%LOG_FILE%"
exit /b %ERRORLEVEL%
