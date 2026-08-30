# Plan de implementación

Este documento divide el MVP de MultiCita en entregas pequeñas, verificables y desplegables. Las tareas se ejecutarán en orden porque las etapas posteriores dependen del aislamiento multiempresa, la autorización y las reglas de disponibilidad.

## Definición de terminado

Una tarea se considera terminada cuando:

- Cumple sus criterios de aceptación.
- Pasa lint, comprobación de tipos, pruebas relacionadas y build de producción.
- No expone secretos ni datos de otra empresa.
- Incluye estados de carga, vacío y error cuando corresponda.
- Está documentada y desplegada en un entorno de preview cuando afecta la interfaz.

## Entrega 0 — Fundación del proyecto

### T-001 Inicializar el repositorio

- [x] Crear aplicación Next.js con App Router, TypeScript, Tailwind y ESLint.
- [x] Conservar la propuesta funcional dentro del repositorio.
- [x] Inicializar Git, enlazar `saturnovill/multicitapp` y publicar `main`.
- [x] Vincular el directorio local con un proyecto de Vercel.
- [ ] Conectar GitHub directamente desde Vercel (requiere habilitar la conexión de GitHub en la cuenta de Vercel).

### T-002 Configurar el sistema visual

- [x] Inicializar shadcn/ui con Radix.
- [x] Instalar componentes base de navegación, formularios, tablas y diálogos.
- [x] Definir tokens de color, tipografía, espaciado y estados de citas.
- [x] Crear shell adaptable con menú lateral y encabezado.

### T-003 Aprovisionar Neon Postgres

- [x] Crear Neon desde la integración administrada por Vercel.
- [x] Configurar `DATABASE_URL` pooled para la aplicación.
- [x] Configurar `DATABASE_URL_UNPOOLED` para migraciones.
- [x] Documentar variables sin guardar secretos en Git.
- [x] Verificar conexión desde local y Vercel.

### T-004 Configurar Drizzle

- [x] Instalar Drizzle ORM, Drizzle Kit y el driver serverless de Neon.
- [x] Crear configuración de migraciones.
- [x] Añadir scripts `db:generate`, `db:migrate` y `db:studio`.
- [x] Añadir un script `db:seed` opcional para datos de desarrollo.
- [x] Implementar inicialización diferida para que el build no falle sin variables.

## Entrega 1 — Identidad y multiempresa

### T-101 Modelo multiempresa

- [x] Crear tablas de empresas, usuarios, membresías, roles y permisos.
- [x] Crear sucursales y asignaciones de usuario a sucursal.
- [x] Incorporar `company_id` en toda entidad operativa.
- [x] Añadir índices compuestos comenzando por `company_id`.
- [x] Crear datos semilla de desarrollo.

### T-102 Autenticación

- [x] Implementar inicio y cierre de sesión.
- [x] Deshabilitar el autorregistro en Neon Auth y en la ruta pública.
- [x] Crear una cuenta inicial de superadministrador.
- [x] Implementar alta controlada de usuarios por el superadministrador (sin invitaciones ni registro público).
- [x] Implementar restablecimiento administrativo y cambio autenticado de contraseña.
- [x] Crear sesión segura en cookie `httpOnly` mediante Neon Auth.
- [x] Añadir rate limiting a los endpoints de acceso.
- [x] Crear pantalla de acceso conectada a Neon Auth.

### T-103 Autorización

- [x] Crear una capa de acceso a datos que valide sesión y empresa activa.
- [x] Definir roles: plataforma, propietario, administrador, gerente, recepción y empleado.
- [x] Filtrar las consultas actuales por empresa y sucursal activas.
- [x] Crear panel exclusivo para altas de empresas y usuarios.
- [x] Implementar selector de empresa y sucursal para superadministración y gerencia.
- [x] Probar que las claves tenant rechazan escrituras mezclando empresas.

### T-104 Auditoría

- [x] Registrar accesos y cambios sensibles.
- [x] Guardar actor, empresa, acción, entidad, fecha y metadatos seguros.
- [x] Crear consulta administrativa de auditoría.

## Entrega 2 — Catálogos operativos

### T-201 Empresas y sucursales

- [x] Alta inicial de empresa y sucursal por el superadministrador.
- [x] CRUD de datos generales de empresa.
- [x] CRUD de sucursales y horarios semanales.
- [x] Días festivos, cierres y horarios especiales.
- [x] Configuración de zona horaria, moneda e intervalos de agenda.

### T-202 Clientes

- [x] CRUD y búsqueda de clientes.
- [x] Detección de posibles duplicados por teléfono o correo.
- [x] Historial básico de citas y ventas.

### T-203 Empleados

- [x] CRUD de empleados.
- [x] Asignación a varias sucursales.
- [x] Horarios, descansos, ausencias y asignaciones temporales.
- [x] Acceso del empleado a su propia agenda.

### T-204 Categorías y servicios

- [x] Completar CRUD de categorías y servicios.
- [x] Precio, duración, impuestos y disponibilidad por sucursal.
- [x] Asignación de servicios que puede realizar cada empleado.
- [x] Tiempos opcionales de preparación y limpieza.

## Entrega 3 — Agenda

### T-301 Motor de disponibilidad

- [x] Calcular disponibilidad por sucursal, empleado, servicio y fecha.
- [x] Considerar horarios, excepciones, bloqueos y duración total.
- [x] Validar nuevamente dentro de una transacción al guardar.
- [x] Implementar una restricción de base de datos contra traslapes.
- [x] Añadir prueba de concurrencia contra la restricción de traslapes.

### T-302 Calendario diario por empleado

- [x] Mostrar un día por pantalla y una columna por empleado.
- [x] Intervalos configurables de 15 minutos como valor inicial.
- [x] Navegación de fecha y desplazamiento horizontal.
- [x] Añadir selector de sucursal.
- [x] Mostrar indicador de hora actual y bloqueos dentro del calendario.
- [x] Adaptar la vista para computadora, tableta y consulta móvil.

### T-303 Operaciones de citas

- [x] Crear citas haciendo clic directamente en la columna y hora del empleado.
- [x] Editar cliente, servicios, empleado, fecha, hora, notas y estado.
- [x] Mover citas mediante arrastrar y soltar; la duración se deriva de los servicios.
- [x] Crear descansos, bloqueos, ausencias, cierres y horarios especiales.
- [x] Mantener historial de cambios mediante auditoría.

### T-304 Listado de citas

- [x] Tabla paginada con filtros y búsqueda.
- [x] Acciones según permisos.
- [x] Exportación CSV.

## Entrega 4 — Reserva pública

### T-401 Página pública por empresa

- [x] Ruta pública identificada por slug de empresa.
- [x] Selección de sucursal, servicios y empleado.
- [x] Opción de primera persona disponible.
- [x] Captura y validación de contacto.

### T-402 Confirmación y notificaciones

- [x] Mostrar resumen y consentimiento antes de confirmar.
- [x] Crear la cita con origen público.
- [ ] Enviar confirmación por correo.
- [ ] Preparar adaptadores para SMS o WhatsApp futuros.

## Entrega 5 — Operación comercial

### T-501 Ventas

- [x] Crear venta manual o desde una cita.
- [x] Asignar empleado por concepto.
- [x] Calcular subtotal, impuestos, descuentos, total y cambio.
- [x] Generar folio y comprobante PDF.
- [x] Implementar cancelaciones con trazabilidad.

### T-502 Pagos

- [x] Efectivo, tarjeta, transferencia y pago combinado.
- [x] Validar que la suma de pagos cubra el total y limitar el cambio a efectivo.
- [x] Registrar devoluciones mediante movimientos compensatorios.

### T-503 Caja

- [x] Apertura, fondo inicial, ingresos, retiros y cierre.
- [x] Conciliación por método de pago.
- [x] Historial de diferencias y responsables.

### T-504 Giftcards

- [x] Emisión con código único, saldo y vencimiento.
- [x] Cargos parciales y devoluciones transaccionales.
- [x] Historial inalterable de movimientos.

### T-505 Comisiones

- [x] Reglas por empleado, servicio o categoría.
- [x] Cálculo por periodo basado en ventas cobradas.
- [x] Ajustes autorizados y reporte descargable.

## Entrega 6 — Calidad y liberación

### T-601 Panel y reportes

- [x] Indicadores de citas, ocupación contra capacidad programada y ventas.
- [x] Reportes por empresa, sucursal, empleado, servicio y periodo.
- [x] Exportaciones CSV y PDF prioritarias.

### T-602 Seguridad y rendimiento

- [x] Revisar permisos, validación, origen, CSP y rate limiting.
- [x] Analizar consultas, índices, paginación y límites de transferencia de datos.
- [x] Pruebas automatizadas de aislamiento multiempresa y concurrencia del calendario.
- [x] Endpoint de salud, límites de consulta y error boundary para diagnóstico inicial.

### T-603 CI/CD y producción

- [x] Ejecutar lint, tipos, pruebas y build en cada pull request.
- [ ] Configurar previews con ramas de base de datos aisladas.
- [x] Aplicar migraciones de producción de forma controlada.
- [x] Documentar respaldo, restauración y guía operativa.

## Primer incremento vertical

El primer incremento que se implementará después de la fundación será:

1. Inicio de sesión.
2. Empresa y sucursal activa.
3. Alta de un empleado y un servicio.
4. Creación de una cita.
5. Visualización de esa cita en el calendario diario.

Este recorrido validará temprano el aislamiento multiempresa, los permisos, el modelo de horarios y la arquitectura del calendario antes de ampliar el resto de módulos.
