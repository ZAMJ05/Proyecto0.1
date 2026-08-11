# Detiene AssetDesk / procesos Node que usan el puerto 3000
# y libera el DLL de Prisma para poder hacer npm run build.
#   powershell -ExecutionPolicy Bypass -File .\scripts\windows\stop-assetdesk.ps1

$ErrorActionPreference = "Continue"
$ports = @(3000)

Write-Host "Buscando procesos en puerto(s): $($ports -join ', ')"

$pids = @()
foreach ($port in $ports) {
  $lines = netstat -ano | Select-String ":$port\s+.*LISTENING"
  foreach ($line in $lines) {
    $parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
    $procId = $parts[-1]
    if ($procId -match "^\d+$" -and $procId -ne "0") {
      $pids += [int]$procId
    }
  }
}

$pids = $pids | Select-Object -Unique

if (-not $pids -or $pids.Count -eq 0) {
  Write-Host "No hay proceso escuchando en 3000."
} else {
  foreach ($procId in $pids) {
    try {
      $p = Get-Process -Id $procId -ErrorAction Stop
      Write-Host "Deteniendo PID $procId ($($p.ProcessName))..."
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Write-Host "  OK"
    } catch {
      Write-Host "  No se pudo detener PID $procId : $($_.Exception.Message)"
    }
  }
}

# A veces quedan node.exe huerfanos de next/prisma
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
  Write-Host ""
  Write-Host "Procesos node.exe aun activos:"
  $nodeProcs | ForEach-Object {
    Write-Host ("  PID {0}  Inicio {1}" -f $_.Id, $_.StartTime)
  }
  Write-Host ""
  $answer = Read-Host "Detener TODOS los node.exe de este usuario? (S/N)"
  if ($answer -match "^[sS]") {
    $nodeProcs | Stop-Process -Force
    Write-Host "Todos los node.exe fueron detenidos."
  }
}

Start-Sleep -Seconds 1
Write-Host ""
Write-Host "Listo. Ahora ejecuta:"
Write-Host "  npm run build"
Write-Host "  npm run start:lan"
Write-Host ""
