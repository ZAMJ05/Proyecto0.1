# Importar MongoDB → SQLite (Prisma)

## Pasos

### 1. Exporta desde MongoDB

Con **MongoDB Compass**:
1. Abre cada colección
2. Export Collection → JSON
3. Guarda los archivos en esta carpeta (`data/mongo-export/`)

Con **mongoexport** (CLI):

```bash
mongoexport --uri="mongodb://localhost:27017/TU_DB" --collection=assets --out=assets.json --jsonArray
mongoexport --uri="mongodb://localhost:27017/TU_DB" --collection=employees --out=employees.json --jsonArray
mongoexport --uri="mongodb://localhost:27017/TU_DB" --collection=positions --out=positions.json --jsonArray
mongoexport --uri="mongodb://localhost:27017/TU_DB" --collection=assignments --out=assignments.json --jsonArray
mongoexport --uri="mongodb://localhost:27017/TU_DB" --collection=maintenances --out=maintenances.json --jsonArray
mongoexport --uri="mongodb://localhost:27017/TU_DB" --collection=users --out=users.json --jsonArray
```

### 2. Nombres de archivo esperados

| Archivo | Modelo Prisma |
|---------|---------------|
| `positions.json` | Position (puestos) |
| `employees.json` | Employee (usuarios de equipo) |
| `assets.json` | Asset (inventario) |
| `assignments.json` | Assignment |
| `maintenances.json` | Maintenance |
| `users.json` | User (login app) |

No hace falta que existan todos. El import omite los que falten.

### 3. Campos que entiende el script

El importador acepta nombres en español o inglés, por ejemplo:

**assets.json**
- `name` / `nombre`
- `category` / `categoria`
- `brand` / `marca`
- `model` / `modelo`
- `serialNumber` / `serial` / `numeroSerial`
- `inventoryNumber` / `inventario` / `NoInventario`
- `status` / `estado`
- `purchaseDate` / `fechaCompra`
- `renewalDate` / `fechaRenovacion` (si no viene, se calcula +4 años)
- `anydesk`, `notes` / `notas`

**employees.json**
- `name` / `nombre`
- `email` / `correo`
- `department` / `departamento`
- `position` / `puesto`
- `active` / `activo`

**assignments.json**
- `assetId` o `serial` del equipo
- `employeeId`, `email` o `nombre` del usuario
- `assignedAt` / `fechaAsignacion`
- `unassignedAt` / `fechaLiberacion`

Si tus campos se llaman distinto, edita `FIELD_MAP` en `scripts/import-from-mongo.ts`.

### 4. Ejecutar importación

Desde la raíz del proyecto:

```bash
npm run db:setup
npm run db:import
npm run dev
```

`db:import` lee los JSON de esta carpeta y los inserta/actualiza en SQLite.

### 5. Notas importantes

- SQLite **no es un clon 1:1** de MongoDB: hay que mapear documentos → tablas.
- Los `_id` de Mongo se remapean a `cuid()` de Prisma; las relaciones se reconstruyen por serial/email/nombre.
- Categorías/estados se normalizan a los valores de la app (`Laptop`, `Activo`, `Stock`, etc.).
- Si no importas `users.json`, se mantiene/crea el admin demo.
