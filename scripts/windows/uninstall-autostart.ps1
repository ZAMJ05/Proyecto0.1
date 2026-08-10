# Quita arranque automatico (tarea + acceso Inicio)
$ErrorActionPreference = "Continue"
$taskName = "AssetDeskAutoStart"

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Tarea $taskName eliminada."
} else {
  Write-Host "No habia tarea $taskName."
}

$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "AssetDesk.lnk"
if (Test-Path $shortcutPath) {
  Remove-Item $shortcutPath -Force
  Write-Host "Acceso Inicio eliminado: $shortcutPath"
} else {
  Write-Host "No habia acceso en Inicio."
}

Write-Host "Listo. AssetDesk ya no iniciara automaticamente."
