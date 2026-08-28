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
- [ ] Añadir un script `db:seed` independiente del onboarding.
- [x] Implementar inicialización diferida para que el build no falle sin variables.

## Entrega 1 — Identidad y multiempresa

### T-101 Modelo multiempresa

- [x] Crear tablas de empresas, usuarios, membresías, roles y permisos.
- [x] Crear sucursales y asignaciones de usuario a sucursal.
- [x] Incorporar `company_id` en toda entidad operativa.
- [x] Añadir índices compuestos comenzando por `company_id`.
- [ ] Crear datos semilla de desarrollo.

### T-102 Autenticación

- [x] Implementar registro inicial, inicio y cierre de sesión.
- [ ] Implementar invitaciones de usuarios a empresas.
- [ ] Implementar recuperación y cambio de contraseña.
- [x] Crear sesión segura en cookie `httpOnly` mediante Neon Auth.
- [ ] Añadir rate limiting a los endpoints de acceso.
- [x] Crear pantallas de registro y acceso conectadas a Neon Auth.

### T-103 Autorización

- [x] Crear una capa de acceso a datos que valide sesión y empresa activa.
- [x] Definir roles: plataforma, propietario, administrador, gerente, recepción y empleado.
- [x] Filtrar las consultas actuales por empresa y sucursal activas.
- [ ] Implementar selector de empresa y sucursal.
- [ ] Probar que una empresa no puede leer ni modificar datos de otra.

### T-104 Auditoría

- [ ] Registrar accesos y cambios sensibles.
- [ ] Guardar actor, empresa, acción, entidad, fecha y metadatos seguros.
- [ ] Crear consulta administrativa de auditoría.

## Entrega 2 — Catálogos operativos

### T-201 Empresas y sucursales

- [ ] CRUD de datos generales de empresa.
- [ ] CRUD de sucursales y horarios semanales.
- [ ] Días festivos, cierres y horarios especiales.
- [ ] Configuración de zona horaria, moneda e intervalos de agenda.

### T-202 Clientes

- [ ] CRUD y búsqueda paginada de clientes.
- [ ] Detección de posibles duplicados por teléfono o correo.
- [ ] Historial básico de citas y ventas.

### T-203 Empleados

- [ ] CRUD de empleados.
- [ ] Asignación a varias sucursales.
- [ ] Horarios, descansos, ausencias y asignaciones temporales.
- [ ] Acceso del empleado a su propia agenda.

### T-204 Categorías y servicios

- [ ] CRUD de categorías y servicios.
- [ ] Precio, duración, impuestos y disponibilidad por sucursal.
- [ ] Asignación de servicios que puede realizar cada empleado.
- [ ] Tiempos opcionales de preparación y limpieza.

## Entrega 3 — Agenda

### T-301 Motor de disponibilidad

- [ ] Calcular disponibilidad por sucursal, empleado, servicio y fecha.
- [ ] Considerar horarios, excepciones, bloqueos y duración total.
- [ ] Validar nuevamente dentro de una transacción al guardar.
- [x] Implementar una restricción de base de datos contra traslapes.
- [ ] Añadir pruebas de concurrencia para reservas simultáneas.

### T-302 Calendario diario por empleado

- [x] Mostrar un día por pantalla y una columna por empleado.
- [ ] Intervalos configurables de 15 minutos como valor inicial.
- [x] Navegación de fecha y desplazamiento horizontal.
- [ ] Añadir selector de sucursal.
- [ ] Mostrar horarios no disponibles e indicador de hora actual.
- [ ] Adaptar la vista para computadora, tableta y consulta móvil.

### T-303 Operaciones de citas

- [ ] Crear citas al seleccionar o arrastrar un intervalo.
- [ ] Editar cliente, servicios, empleado, fecha, hora, notas y estado.
- [ ] Mover y redimensionar mediante arrastrar y soltar.
- [ ] Crear descansos, bloqueos, ausencias y eventos personalizados.
- [ ] Mantener historial de cambios.

### T-304 Listado de citas

- [ ] Tabla paginada con filtros y búsqueda.
- [ ] Acciones según permisos.
- [ ] Exportación CSV.

## Entrega 4 — Reserva pública

### T-401 Página pública por empresa

- [ ] Ruta pública identificada por slug de empresa.
- [ ] Selección de sucursal, servicios y empleado.
- [ ] Opción de primera persona disponible.
- [ ] Captura y validación de contacto.

### T-402 Confirmación y notificaciones

- [ ] Mostrar resumen y políticas antes de confirmar.
- [ ] Crear la cita con origen público.
- [ ] Enviar confirmación por correo.
- [ ] Preparar adaptadores para SMS o WhatsApp futuros.

## Entrega 5 — Operación comercial

### T-501 Ventas

- [ ] Crear venta manual o desde una cita.
- [ ] Asignar empleado por concepto.
- [ ] Calcular subtotal, impuestos, descuentos, total y cambio.
- [ ] Generar folio y comprobante PDF.
- [ ] Implementar cancelaciones con trazabilidad.

### T-502 Pagos

- [ ] Efectivo, tarjeta, transferencia y pago combinado.
- [ ] Validar que la suma de pagos coincida con el total.
- [ ] Registrar devoluciones mediante movimientos compensatorios.

### T-503 Caja

- [ ] Apertura, fondo inicial, ingresos, retiros y cierre.
- [ ] Conciliación por método de pago.
- [ ] Historial de diferencias y responsables.

### T-504 Giftcards

- [ ] Emisión con código único, saldo y vencimiento.
- [ ] Cargos parciales y devoluciones transaccionales.
- [ ] Historial inalterable de movimientos.

### T-505 Comisiones

- [ ] Reglas por empleado, servicio o categoría.
- [ ] Cálculo por periodo basado en ventas cobradas.
- [ ] Ajustes autorizados y reporte descargable.

## Entrega 6 — Calidad y liberación

### T-601 Panel y reportes

- [ ] Indicadores de citas, ocupación, ventas y caja.
- [ ] Reportes por empresa, sucursal, empleado, servicio y periodo.
- [ ] Exportaciones CSV y PDF prioritarias.

### T-602 Seguridad y rendimiento

- [ ] Revisar permisos, validación, CSRF, CSP y rate limiting.
- [ ] Analizar consultas, índices y transferencia de datos.
- [ ] Pruebas de aislamiento multiempresa y carga del calendario.
- [ ] Monitoreo de errores y consultas lentas.

### T-603 CI/CD y producción

- [ ] Ejecutar lint, tipos, pruebas y build en cada pull request.
- [ ] Configurar previews con ramas de base de datos aisladas.
- [ ] Aplicar migraciones de producción de forma controlada.
- [ ] Verificar respaldo, restauración y guía operativa.

## Primer incremento vertical

El primer incremento que se implementará después de la fundación será:

1. Inicio de sesión.
2. Empresa y sucursal activa.
3. Alta de un empleado y un servicio.
4. Creación de una cita.
5. Visualización de esa cita en el calendario diario.

Este recorrido validará temprano el aislamiento multiempresa, los permisos, el modelo de horarios y la arquitectura del calendario antes de ampliar el resto de módulos.
