# Importar inventario-ti (tus JSON de Mongo)

Archivos esperados en esta carpeta:

- `assets.json` ← colección assets
- `people.json` ← colección people
- `history.json` ← colección history
- `log.json` ← colección log

## En Windows

```powershell
cd C:\Users\sistemas2\Music\Proyecto0.1
git pull
powershell -ExecutionPolicy Bypass -File .\scripts\windows\stop-assetdesk.ps1
npm run env:init
npm run db:init
npm run db:import:ti
npm run build
npm run start:lan
```

## Qué hace el importador

| Origen Mongo | Destino AssetDesk |
|---|---|
| `people` | Empleados + Puestos |
| `assets` | Inventario (equipos) |
| `assets.assignedTo` | Asignaciones activas |
| `assets.lastMaintenance` | Mantenimientos |
| `history` | Cambios / ActivityLog |
| `log` | Cambios / ActivityLog |

Estados: `active`→Activo, `stored`/`stock`→Stock, `retired`→Baja  
Serial vacío o `N/A` → se genera `SIN-SERIAL-{tag}`

**No uses `db:setup` / `db:seed`** después: borran datos.
