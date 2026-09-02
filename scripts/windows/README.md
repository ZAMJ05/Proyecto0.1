# Arranque automático de AssetDesk (Windows)

## Instalación (hazlo en este orden)

Abre **PowerShell** en la carpeta del proyecto:

```powershell
cd C:\Users\sistemas2\Music\Proyecto0.1
git pull
npm install
npm run db:init
npm run build
powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-autostart.ps1
```

Importante: **no ejecutes `npm run db:setup`** despues de cargar inventario real.
Ese comando borra la base y deja solo datos demo. Los cambios viven en `data\assetdesk.db`.

Eso registra:
1. Tarea programada **AssetDeskAutoStart** (espera 45 s al iniciar sesión)
2. Acceso directo en la carpeta **Inicio** de Windows

## Probar sin reiniciar

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\test-autostart.ps1
```

Luego abre: http://localhost:3000

## Error EPERM al hacer `npm run build`

Significa que la app **sigue corriendo** y Windows bloquea el DLL de Prisma.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\stop-assetdesk.ps1
npm run build
npm run start:lan
```

## Si el autostart no funciona

1. Mira el log:
   ```powershell
   notepad .\logs\assetdesk-startup.log
   ```
2. Errores típicos:
   - `No se encontro node.exe` → instala [Node.js LTS](https://nodejs.org) y vuelve a correr `install-autostart.ps1`
   - `build fallo` → ejecuta a mano `npm run build` y revisa el error
   - `Falta .env` → `copy .env.example .env`
3. Confirma que existe el acceso de Inicio:
   ```powershell
   explorer shell:startup
   ```
   Debe verse `AssetDesk.lnk`
4. Confirma la tarea:
   ```powershell
   Get-ScheduledTask -TaskName AssetDeskAutoStart | Format-List
   ```

## Desactivar

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\uninstall-autostart.ps1
```

## Notas

- La PC debe tener **sesión iniciada** (puede estar bloqueada).
- El servicio usa el puerto **3000** en toda la red (`0.0.0.0`).
- Si moviste la carpeta del proyecto, reinstala el autostart.
