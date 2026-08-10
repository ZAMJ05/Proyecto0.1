# AssetDesk — Inventario IT

Aplicación web para gestionar inventario de equipos IT: dashboard, ciclo de vida, asignaciones, stock, puestos y control de accesos (admin / user).

## Características

1. **Dashboard** con equipos activos, cambios recientes, activos sin asignar, totales y deshabilitados (clic para filtrar).
2. **Ciclo de vida**: renovación a 4 años desde la compra y mantenimiento de cómputo cada 6 meses.
3. **Asignaciones** de equipos/complementos a usuarios + historial.
4. **Stock / reserva** de equipos nuevos.
5. **Alta de inventario** con nombre, categoría, marca, modelo, serial, no. inventario, estado, fechas, AnyDesk (laptops activas) y notas.
6. **Filtros avanzados** y vista de usuarios con sus activos.
7. **Búsqueda general** (serial o usuario), exportación CSV/PDF y gráficas.
8. **Puestos** para asignar a usuarios.
9. Persistencia en **SQLite** (Prisma).
10. Roles **ADMIN** (CRUD) y **USER** (solo consulta).

## Requisitos

- Node.js 20+
- npm

## Instalación

```bash
npm install
npm run db:setup
npm run dev
```

`db:setup` crea `.env` desde `.env.example` si no existe, prepara SQLite y carga datos demo.

Si ves el error `Environment variable not found: DATABASE_URL`, crea el `.env` así:

```bash
# Windows (CMD)
copy .env.example .env

# Windows (PowerShell) / macOS / Linux
cp .env.example .env
```

Luego vuelve a ejecutar `npm run db:setup` y `npm run dev`.

Abre [http://localhost:3000](http://localhost:3000).

### Acceso en red local (LAN)

Para que otros equipos de tu red empresarial vean la app:

```bash
# desarrollo
npm run dev:lan

# o producción (recomendado en red)
npm run build
npm run start:lan
```

1. En tu PC, obtén tu IP local:
   - Windows: `ipconfig` → busca **IPv4** (ej. `192.168.1.45`)
   - macOS/Linux: `ip addr` o `hostname -I`
2. Desde otro equipo abre: `http://TU_IP:3000` (ej. `http://192.168.1.45:3000`)
3. Si no carga, permite el puerto **3000** en el Firewall de Windows (entrada TCP).
4. Tu PC y los demás deben estar en la misma red/VLAN (o con enrutamiento permitido).

Si ves el login pero **no entra al dashboard**, es la cookie de sesión en HTTP.
Asegúrate de tener en `.env`:

```
COOKIE_SECURE="false"
```

Luego reinicia (`npm run start:lan` o `npm run dev:lan`).
Solo pon `COOKIE_SECURE="true"` cuando publiques con HTTPS.

## Acceso inicial

Las credenciales de demo **no se muestran en la app**. Solo se crean al ejecutar `npm run db:seed` / `db:setup` y se imprimen en la terminal del seed. Cámbialas después del primer acceso desde **Accesos app**.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm start` — producción
- `npm run db:setup` — crea esquema y carga datos demo
- `npm run db:seed` — vuelve a sembrar datos
- `npm run db:import` — importa JSON exportados de MongoDB (`data/mongo-export/`)

Para migrar desde MongoDB, ver `data/mongo-export/README.md`.

## Variables de entorno

Copia `.env.example` a `.env`:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
```
