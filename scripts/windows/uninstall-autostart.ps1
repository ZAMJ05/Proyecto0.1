# Elimina el arranque automatico de AssetDesk.
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\uninstall-autostart.ps1

$ErrorActionPreference = "Continue"
$taskName = "AssetDeskAutoStart"

$existing = schtasks /Query /TN $taskName 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "No hay tarea $taskName registrada."
  exit 0
}

schtasks /Delete /TN $taskName /F 2>&1 | Out-Null
Write-Host "Tarea $taskName eliminada. AssetDesk ya no iniciara al encender."
