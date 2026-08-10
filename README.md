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

## Credenciales demo

| Rol   | Email                         | Contraseña |
|-------|-------------------------------|------------|
| Admin | admin@inventario.local        | admin123   |
| User  | consulta@inventario.local     | user123    |

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm start` — producción
- `npm run db:setup` — crea esquema y carga datos demo
- `npm run db:seed` — vuelve a sembrar datos

## Variables de entorno

Copia `.env.example` a `.env`:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
```
