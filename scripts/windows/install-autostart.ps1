# Instala arranque automatico de AssetDesk (Tarea programada + carpeta Inicio).
# Ejecutar:
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-autostart.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = (Resolve-Path (Join-Path $scriptDir "start-assetdesk.bat")).Path
$vbsPath = (Resolve-Path (Join-Path $scriptDir "start-assetdesk-hidden.vbs")).Path
$appDir = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
$taskName = "AssetDeskAutoStart"

Write-Host "App:  $appDir"
Write-Host "BAT:  $batPath"
Write-Host "VBS:  $vbsPath"
Write-Host ""

# --- 1) Tarea programada robusta ---
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Tarea anterior eliminada."
}

$action = New-ScheduledTaskAction `
  -Execute "wscript.exe" `
  -Argument "`"$vbsPath`"" `
  -WorkingDirectory $appDir

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
# Espera 45s tras iniciar sesion (red/Node listos)
try { $trigger.Delay = "PT45S" } catch { }

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Force | Out-Null

Write-Host "OK: Tarea programada '$taskName' creada (delay 45s al iniciar sesion)."

# --- 2) Acceso directo en carpeta Inicio (mas fiable en muchas PCs) ---
$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "AssetDesk.lnk"
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = "wscript.exe"
$sc.Arguments = "`"$vbsPath`""
$sc.WorkingDirectory = $appDir
$sc.WindowStyle = 7
$sc.Description = "Inicia AssetDesk inventario IT"
$sc.Save()
Write-Host "OK: Acceso directo en Inicio: $shortcutPath"

# --- 3) Preparacion minima ---
Push-Location $appDir
try {
  if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env" -Force
    Write-Host "OK: Se creo .env"
  }
  if (-not (Test-Path ".next\BUILD_ID")) {
    Write-Host "Compilando app (primera vez, puede tardar)..."
    npm run build
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "=============================="
Write-Host " Instalacion completada"
Write-Host "=============================="
Write-Host "Probar ahora (sin reiniciar):"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\windows\test-autostart.ps1"
Write-Host ""
Write-Host "Ver log:"
Write-Host "  notepad .\logs\assetdesk-startup.log"
Write-Host ""
Write-Host "Desactivar:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\windows\uninstall-autostart.ps1"
Write-Host ""
