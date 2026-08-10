# Registra AssetDesk para que inicie al encender Windows (inicio de sesion).
# Ejecutar una vez en PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-autostart.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = Join-Path $scriptDir "start-assetdesk.bat"
$taskName = "AssetDeskAutoStart"

if (-not (Test-Path $batPath)) {
  throw "No se encontro start-assetdesk.bat en $scriptDir"
}

# Quita tarea previa si existe
schtasks /Query /TN $taskName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  schtasks /Delete /TN $taskName /F | Out-Null
}

# /SC ONLOGON = al iniciar sesion del usuario actual
# /RL LIMITED = sin privilegios elevados (mejor compatibilidad)
$tr = "`"$batPath`""
schtasks /Create `
  /TN $taskName `
  /TR $tr `
  /SC ONLOGON `
  /RL LIMITED `
  /F

if ($LASTEXITCODE -ne 0) {
  throw "No se pudo crear la tarea programada. Ejecuta PowerShell como el usuario que usara la app."
}

Write-Host ""
Write-Host "Listo. Tarea creada: $taskName"
Write-Host "La app arrancara al iniciar sesion de Windows."
Write-Host ""
Write-Host "Comandos utiles:"
Write-Host "  Probar ahora:     schtasks /Run /TN $taskName"
Write-Host "  Ver estado:       schtasks /Query /TN $taskName /V /FO LIST"
Write-Host "  Desactivar:       powershell -ExecutionPolicy Bypass -File .\scripts\windows\uninstall-autostart.ps1"
Write-Host "  Log:              logs\assetdesk-startup.log"
Write-Host ""
