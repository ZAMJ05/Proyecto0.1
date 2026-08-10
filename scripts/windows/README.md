# Arranque automático de AssetDesk (Windows)

## 1. Preparar una vez

En la carpeta del proyecto:

```bat
npm install
npm run db:setup
npm run build
```

## 2. Activar inicio automático

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-autostart.ps1
```

Eso crea la tarea de Windows **AssetDeskAutoStart**, que corre al iniciar sesión.

## 3. Probar sin reiniciar

```bat
schtasks /Run /TN AssetDeskAutoStart
```

Luego abre `http://localhost:3000` o `http://TU_IP:3000`.

## 4. Ver log si falla

```
logs\assetdesk-startup.log
```

## 5. Desactivar

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\uninstall-autostart.ps1
```

## Notas

- La PC debe quedar encendida y con sesión iniciada (o sesión bloqueada, no apagada).
- El script usa `npm run start:lan` (puerto 3000, accesible en la red).
- Si moviste el proyecto de carpeta, vuelve a ejecutar `install-autostart.ps1`.
- En el Firewall de Windows permite Node/puerto 3000 si otros equipos no alcanzan la app.
