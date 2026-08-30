# MultiCita

Plataforma web multiempresa para administrar sucursales, empleados, clientes, servicios, citas, ventas y caja.

## Stack

- Next.js (App Router) y TypeScript
- Tailwind CSS y shadcn/ui
- Neon Serverless Postgres
- Drizzle ORM y Drizzle Kit
- Vercel

## Estado

La fundación técnica y el primer recorrido de identidad están implementados:

- Portada e inicio/cierre de sesión con Neon Auth.
- Registro público deshabilitado tanto en Neon como en la aplicación.
- Panel exclusivo de superadministración para crear empresas y usuarios.
- Esquema multiempresa con claves compuestas de aislamiento y ventas transaccionales.
- Agenda diaria con una columna por empleado y navegación por fecha.
- Selector de sucursal para superadministradores y gerentes.
- Catálogo básico de servicios y alta de citas con cliente nuevo o existente.
- Restricción PostgreSQL que impide citas solapadas para un empleado.
- Reservación pública por empresa con sucursal, servicios, profesional y horarios reales disponibles.
- Confirmación pública con referencia y registro de origen en la agenda interna.
- Punto de venta con conversión desde cita, pagos combinados, descuentos, impuestos, cambio y folios.
- Recibos PDF, cancelaciones lógicas con auditoría y reportes exportables en CSV/PDF.
- Caja por sucursal con apertura, movimientos, conciliación y cierre.
- Gift cards con saldo transaccional, vencimiento, uso en ventas y devoluciones.
- Comisiones configurables por empleado, servicio o categoría con aprobación y CSV.

Las cuentas no se crean desde el login. El superadministrador registra cada
empresa, genera las credenciales iniciales y asigna el rol correspondiente.

Consulta [IMPLEMENTACION.md](./IMPLEMENTACION.md) para ver el avance y las siguientes tareas.

## Configuración local

1. Instala dependencias con `npm install`.
2. Copia `.env.example` como `.env.local`.
3. Ejecuta `vercel link` y después `vercel env pull .env.local`.
4. Aplica la base de datos con `npm run db:migrate`.
5. Inicia el entorno con `npm run dev`.

Comandos útiles:

- `npm run typecheck`: comprueba los tipos.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: genera el build de producción.
- `npm run db:generate`: crea una migración desde el esquema Drizzle.
- `npm run db:migrate`: aplica migraciones pendientes en Neon.
- `npm run db:studio`: abre Drizzle Studio.

No deben incorporarse archivos `.env*` con secretos al repositorio.

## Documentación

- [Propuesta funcional y técnica](./PROPUESTA_PROYECTO.md)
- [Plan de implementación](./IMPLEMENTACION.md)
