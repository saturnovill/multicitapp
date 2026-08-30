# Guía operativa

## Liberación

1. Ejecutar `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`.
2. Crear y revisar la migración con `npm run db:generate`.
3. Probar la migración en una rama de Neon o base de preview antes de producción.
4. Aplicar `npm run db:migrate` con `DATABASE_URL_UNPOOLED` apuntando al entorno correcto.
5. Publicar el mismo commit en Vercel. La integración Git de Vercel genera previews para ramas y producción desde `main`.
6. Verificar `/api/health`, login, agenda, creación de cita, venta y reserva pública.

La prueba temporal de invariantes se ejecuta con `ALLOW_DB_INVARIANT_TEST=true npm run db:verify-invariants`; valida aislamiento tenant y competencia por el mismo horario, y elimina sus registros al finalizar.

## Datos demo

El seed es idempotente y está bloqueado por una confirmación explícita:

```powershell
$env:ALLOW_DEMO_SEED='true'
npm run db:seed:demo -- --company=cuatrocero
```

Genera categorías, servicios por sucursal, clientes, horarios, asignaciones, citas, cajas abiertas, ventas, gift cards y una regla de comisión. No crea usuarios ni envía notificaciones.

## Recuperación

- Antes de una migración destructiva, crear una rama de Neon desde producción.
- Para restaurar, promover la rama verificada o usar la restauración puntual disponible en Neon según el plan contratado.
- Las cancelaciones de ventas y movimientos financieros son compensatorios; no deben borrarse manualmente.
- Los secretos viven en Neon/Vercel y `.env.local`; nunca se versionan.

## Diagnóstico

- Salud de aplicación y base de datos: `GET /api/health`.
- Logs de despliegue: `vercel logs <deployment-url>`.
- Estado del despliegue: `vercel inspect <deployment-url>`.
- Auditoría funcional: `/app/admin/auditoria`.
- Consultas de datos: Drizzle Studio mediante `npm run db:studio` y acceso restringido.

## Seguridad

- El registro público está deshabilitado; solo el superadministrador crea cuentas.
- Ocho intentos fallidos de login dentro de 15 minutos bloquean la combinación IP/correo durante 30 minutos.
- Suspender una cuenta revoca su acceso funcional aunque conserve una sesión de identidad.
- Cambiar la contraseña desde Seguridad cierra las demás sesiones.
- Los encabezados CSP, HSTS, anti-iframe, permisos y `nosniff` se aplican globalmente.

## Notificaciones

Correo, SMS y WhatsApp están expresamente fuera del alcance actual. No existe ningún envío automático.
