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

- Portada, registro e inicio/cierre de sesión con Neon Auth.
- Onboarding de empresa, propietario, sucursal y primer empleado.
- Esquema multiempresa de 16 tablas con claves compuestas de aislamiento.
- Agenda diaria con una columna por empleado y navegación por fecha.
- Restricción PostgreSQL que impide citas solapadas para un empleado.

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
