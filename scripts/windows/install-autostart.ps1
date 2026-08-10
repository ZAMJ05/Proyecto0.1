# Registra AssetDesk para que inicie al encender Windows (inicio de sesion).
# Ejecutar una vez en PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-autostart.ps1

$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = (Resolve-Path (Join-Path $scriptDir "start-assetdesk.bat")).Path
$taskName = "AssetDeskAutoStart"

if (-not (Test-Path -LiteralPath $batPath)) {
  throw "No se encontro start-assetdesk.bat en $scriptDir"
}

# Comprobar si ya existe sin tumbar el script cuando no esta
$existing = schtasks /Query /TN $taskName 2>&1
if ($LASTEXITCODE -eq 0) {
  schtasks /Delete /TN $taskName /F 2>&1 | Out-Null
}

# /SC ONLOGON = al iniciar sesion del usuario actual
# Rutas con espacios van entre comillas
$tr = "`"$batPath`""

$createOutput = schtasks /Create /TN $taskName /TR $tr /SC ONLOGON /RL LIMITED /F 2>&1
$createCode = $LASTEXITCODE

if ($createCode -ne 0) {
  Write-Host $createOutput
  throw "No se pudo crear la tarea programada (codigo $createCode)."
}

Write-Host ""
Write-Host "Listo. Tarea creada: $taskName"
Write-Host "Script: $batPath"
Write-Host "La app arrancara al iniciar sesion de Windows."
Write-Host ""
Write-Host "Comandos utiles:"
Write-Host "  Probar ahora:     schtasks /Run /TN $taskName"
Write-Host "  Ver estado:       schtasks /Query /TN $taskName /V /FO LIST"
Write-Host "  Desactivar:       powershell -ExecutionPolicy Bypass -File .\scripts\windows\uninstall-autostart.ps1"
Write-Host "  Log:              logs\assetdesk-startup.log"
Write-Host ""
