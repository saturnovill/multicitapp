# MultiCita

Plataforma web multiempresa para administrar sucursales, empleados, clientes, servicios, citas, ventas y caja.

## Stack

- Next.js (App Router) y TypeScript
- Tailwind CSS y shadcn/ui
- Neon Serverless Postgres
- Drizzle ORM y Drizzle Kit
- Vercel

## Estado

El proyecto está en su etapa inicial. Consulta [IMPLEMENTACION.md](./IMPLEMENTACION.md) para ver las entregas, tareas y criterios de aceptación.

## Configuración local

1. Instala dependencias con `npm install`.
2. Copia `.env.example` como `.env.local`.
3. Vincula el proyecto con Vercel y descarga las variables reales.
4. Ejecuta las migraciones indicadas en los scripts del proyecto.
5. Inicia el entorno con `npm run dev`.

No deben incorporarse archivos `.env*` con secretos al repositorio.

## Documentación

- [Propuesta funcional y técnica](./PROPUESTA_PROYECTO.md)
- [Plan de implementación](./IMPLEMENTACION.md)

