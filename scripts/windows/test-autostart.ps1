# Prueba el arranque ahora y muestra el final del log.
$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
$vbsPath = Join-Path $scriptDir "start-assetdesk-hidden.vbs"
$logFile = Join-Path $appDir "logs\assetdesk-startup.log"
$taskName = "AssetDeskAutoStart"

Write-Host "App: $appDir"
Write-Host ""

# Liberar puerto 3000 si hay proceso zombie opcional? No matamos nada automaticamente.

Write-Host "1) Probando script oculto..."
Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`"" -WorkingDirectory $appDir
Start-Sleep -Seconds 8

Write-Host "2) Probando tarea programada (si existe)..."
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
  Start-ScheduledTask -TaskName $taskName
  Start-Sleep -Seconds 5
  $info = Get-ScheduledTaskInfo -TaskName $taskName
  Write-Host ("   Ultima ejecucion: {0}  Resultado: {1}" -f $info.LastRunTime, $info.LastTaskResult)
} else {
  Write-Host "   No hay tarea $taskName. Ejecuta install-autostart.ps1 primero."
}

Write-Host ""
Write-Host "3) Puerto 3000:"
$listening = netstat -ano | Select-String ":3000\s+.*LISTENING"
if ($listening) {
  Write-Host "   OK - hay proceso en 3000"
  $listening | ForEach-Object { Write-Host "   $_" }
} else {
  Write-Host "   NO escucha en 3000 todavia (revisa el log)."
}

Write-Host ""
Write-Host "4) Ultimas lineas del log:"
if (Test-Path $logFile) {
  Get-Content $logFile -Tail 40
} else {
  Write-Host "   Aun no existe $logFile"
}

Write-Host ""
Write-Host "Abre en el navegador: http://localhost:3000"
