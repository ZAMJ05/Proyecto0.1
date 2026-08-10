# Elimina el arranque automatico de AssetDesk.
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\uninstall-autostart.ps1

$taskName = "AssetDeskAutoStart"

schtasks /Query /TN $taskName 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "No hay tarea $taskName registrada."
  exit 0
}

schtasks /Delete /TN $taskName /F
Write-Host "Tarea $taskName eliminada. AssetDesk ya no iniciara al encender."
