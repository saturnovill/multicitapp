# Propuesta de Proyecto

## Plataforma Multiempresa para Gestión de Citas, Operación y Ventas

**Cliente:** [Nombre del cliente]  
**Proveedor:** [Nombre del proveedor]  
**Fecha:** [Fecha de presentación]  
**Versión:** 1.0

---

## 1. Resumen ejecutivo

Se propone el diseño y desarrollo de una plataforma web multiempresa para administrar negocios que prestan servicios mediante citas. La solución será aplicable a distintos giros —por ejemplo, salones, clínicas, consultorios, talleres, centros de atención, academias o empresas de servicios profesionales— sin depender de términos o procesos exclusivos de una industria.

Cada empresa operará dentro de un espacio independiente y seguro, con sus propias sucursales, usuarios, empleados, clientes, servicios, horarios, citas, ventas, movimientos de caja, tarjetas de regalo, comisiones y reportes. Ninguna empresa podrá consultar o modificar información perteneciente a otra.

La operación diaria se concentrará en un calendario por sucursal. El calendario mostrará un día a la vez, utilizará una columna por empleado y permitirá crear, mover, redimensionar y actualizar citas de forma visual.

La plataforma se desarrollará con **Next.js**, **TypeScript**, **Tailwind CSS** y **shadcn/ui**. Para los datos se propone **PostgreSQL**, debido a su buen rendimiento, consistencia transaccional y capacidad para modelar de manera segura las relaciones de un sistema multiempresa.

---

## 2. Objetivo general

Crear una plataforma centralizada, rápida y escalable que permita a múltiples empresas gestionar su operación, agenda, personal, clientes y cobros desde una sola aplicación, conservando independencia total de datos, configuración e identidad visual entre empresas.

### Objetivos específicos

- Centralizar la agenda diaria de todas las sucursales.
- Mostrar la disponibilidad de los empleados en tiempo real.
- Evitar cruces de horarios y reservas incompatibles.
- Administrar empresas, sucursales, empleados, usuarios, clientes y servicios.
- Permitir reservas internas y reservas públicas en línea.
- Relacionar una cita con su cobro o venta.
- Controlar caja, métodos de pago, descuentos, comisiones y tarjetas de regalo.
- Proporcionar permisos según empresa, sucursal y rol.
- Generar indicadores y reportes operativos y financieros.
- Construir una base técnica que permita incorporar posteriormente pagos en línea, notificaciones, facturación, membresías e integraciones externas.

---

## 3. Modelo multiempresa

La plataforma tendrá una arquitectura **multi-tenant**. Cada empresa será un tenant y tendrá información aislada dentro del sistema.

### Jerarquía principal

```text
Plataforma
└── Empresa
    ├── Configuración e identidad
    ├── Sucursales
    │   ├── Horarios
    │   ├── Empleados asignados
    │   ├── Citas
    │   ├── Ventas
    │   └── Caja
    ├── Usuarios y roles
    ├── Clientes
    ├── Empleados
    ├── Categorías y servicios
    ├── Giftcards
    ├── Comisiones y nómina
    └── Reportes
```

### Reglas de aislamiento

- Todo registro operativo incluirá un identificador de empresa (`company_id`).
- Los registros que dependan de una ubicación incluirán también un identificador de sucursal (`branch_id`).
- Las consultas y operaciones del servidor se limitarán siempre a la empresa activa.
- El usuario podrá pertenecer a una o más empresas y tener un rol diferente en cada una.
- Cuando un usuario tenga acceso a varias empresas o sucursales, podrá cambiar su contexto desde la interfaz.
- Se utilizarán índices compuestos por empresa, sucursal, fecha, estado y empleado para mantener rápidas las consultas más frecuentes.
- Las acciones sensibles quedarán registradas en una bitácora de auditoría.

---

## 4. Tipos de usuario y permisos

Los nombres y permisos exactos podrán configurarse durante el análisis, pero se propone la siguiente base:

### Administrador de plataforma

- Administra las empresas registradas en la plataforma.
- Puede activar, suspender o configurar una empresa.
- Consulta métricas generales y bitácoras técnicas.
- No participa en la operación diaria de las empresas.

### Propietario o administrador de empresa

- Acceso completo a la información de su empresa.
- Administra sucursales, usuarios, roles, servicios, empleados y configuraciones.
- Consulta ventas, reportes, comisiones y cierres de caja.

### Gerente de sucursal

- Administra la operación de las sucursales autorizadas.
- Consulta y modifica citas, personal, ventas y caja de esas sucursales.

### Recepción o caja

- Administra clientes, citas, cobros, giftcards y movimientos de caja.
- No accede a configuraciones críticas salvo autorización expresa.

### Empleado o prestador de servicio

- Consulta su propia agenda.
- Actualiza el estado de sus citas y, si se autoriza, registra notas.
- No accede a información financiera global.

El sistema aplicará permisos tanto en la interfaz como en el servidor. Ocultar un botón no sustituirá la validación de autorización en la API.

---

## 5. Alcance funcional

### 5.1 Acceso y seguridad

- Inicio y cierre de sesión.
- Recuperación y cambio de contraseña.
- Invitación de usuarios por correo.
- Sesiones seguras mediante cookies `httpOnly`.
- Selección de empresa y sucursal activa cuando corresponda.
- Control de acceso basado en roles y permisos.
- Protección contra intentos repetidos de acceso.
- Registro de inicios de sesión y acciones administrativas relevantes.
- Opción futura de autenticación de dos factores y acceso con proveedores externos.

### 5.2 Panel principal

- Resumen del día por empresa o sucursal.
- Citas programadas, confirmadas, atendidas y canceladas.
- Ventas e ingresos del periodo.
- Empleados disponibles y ocupación de agenda.
- Alertas de próximas citas, conflictos o pendientes de cobro.
- Accesos rápidos a nueva cita, nuevo cliente y nueva venta.

### 5.3 Empresas

- Alta, consulta, edición, activación y suspensión de empresas.
- Nombre comercial, razón social, logotipo, datos de contacto y zona horaria.
- Moneda principal, impuestos, folios, políticas e instrucciones para clientes.
- Preferencias de agenda, intervalos de tiempo y anticipación de reservas.
- Personalización básica de la página pública de reservas.

### 5.4 Sucursales

- Administración de nombre, dirección, teléfono, correo, fotografía y ubicación.
- Horarios regulares por día de la semana.
- Horarios especiales, días festivos y cierres extraordinarios.
- Asignación de usuarios y empleados.
- Configuración de caja, moneda y disponibilidad de servicios por sucursal.

### 5.5 Usuarios y roles

- Alta, invitación, edición, desactivación y consulta de usuarios.
- Asignación a una o varias empresas y sucursales.
- Roles predeterminados y posibilidad de evolucionar a permisos personalizados.
- Visualización del menú y acciones disponibles según permisos.

### 5.6 Clientes

- Directorio de clientes por empresa.
- Nombre, teléfonos, correo, dirección, notas y etiquetas.
- Búsqueda rápida y detección de posibles duplicados.
- Historial de citas, compras, cancelaciones y giftcards.
- Preferencias de contacto y consentimiento para notificaciones.
- Exportación de información autorizada.

### 5.7 Empleados

- Perfil, fotografía, datos de contacto, tipo de contratación y estado.
- Asignación a una o varias sucursales.
- Horarios de trabajo por sucursal y día.
- Excepciones, descansos, vacaciones, ausencias y bloqueos.
- Servicios que puede realizar cada empleado.
- Comisión fija, porcentual o por servicio, según configuración.
- Traslado o asignación temporal a otra sucursal.

### 5.8 Categorías y servicios

- Categorías configurables por cada empresa.
- Servicios con código, nombre, descripción, duración, precio, impuestos y estado.
- Precio y duración distintos por sucursal, cuando sea necesario.
- Asignación de empleados capacitados para cada servicio.
- Tiempo de preparación o limpieza opcional antes o después de una cita.
- Imágenes y disponibilidad para reserva pública.

### 5.9 Calendario de citas

El calendario será la pantalla operativa principal.

#### Vista diaria por empleado

- Un día por pantalla.
- Una columna por empleado de la sucursal seleccionada.
- Encabezado de columna con nombre, fotografía y horario del empleado.
- Eje vertical de horas con intervalos configurables, inicialmente de 15 minutos.
- Desplazamiento horizontal cuando existan muchos empleados.
- Horas no laborables visualmente bloqueadas.
- Indicador de la hora actual.
- Colores por estado o tipo de evento.
- Filtros por sucursal, empleado, servicio y estado.

#### Operación de la agenda

- Crear una cita haciendo clic o arrastrando sobre un espacio disponible.
- Mover una cita entre horarios o empleados mediante arrastrar y soltar.
- Ajustar su duración de manera visual.
- Confirmar los cambios antes de guardar cuando afecten empleado, fecha o duración.
- Validar disponibilidad del empleado y horario de la sucursal desde el servidor.
- Evitar citas traslapadas, incluso si dos usuarios intentan reservar al mismo tiempo.
- Mostrar advertencias configurables para clientes con cancelaciones o adeudos.
- Crear bloqueos, descansos, ausencias y eventos personalizados.
- Copiar o reprogramar citas.
- Acciones rápidas para confirmar, iniciar, completar, cancelar, marcar ausencia o cobrar.

#### Datos de la cita

- Empresa y sucursal.
- Cliente.
- Empleado responsable.
- Uno o varios servicios.
- Inicio, fin, duración total y zona horaria.
- Estado, origen, notas y precio estimado.
- Usuario que creó o modificó la cita.
- Historial de cambios.

#### Estados sugeridos

- Pendiente.
- Confirmada.
- En espera.
- En servicio.
- Completada.
- Cancelada.
- No asistió.

### 5.10 Listado de citas

- Consulta paginada con filtros por fechas, empresa, sucursal, empleado, cliente y estado.
- Búsqueda por folio, nombre o teléfono.
- Exportación de resultados.
- Acceso al detalle y a la bitácora de cambios.
- Identificación del origen: interna, reserva pública o integración externa.

### 5.11 Reserva pública en línea

Cada empresa podrá disponer de una dirección pública propia, por ejemplo:

```text
/reservar/{empresa}
```

El flujo permitirá:

1. Elegir sucursal.
2. Elegir uno o varios servicios.
3. Elegir empleado o seleccionar la primera persona disponible.
4. Elegir fecha y horario calculado en tiempo real.
5. Capturar datos de contacto.
6. Aceptar políticas de servicio y cancelación.
7. Confirmar y consultar el resumen de la reserva.

La disponibilidad considerará horarios de sucursal, horarios del empleado, duración de servicios, bloqueos, descansos, citas existentes y anticipación mínima. Como ampliación podrá solicitarse anticipo o pago completo en línea.

### 5.12 Ventas y punto de venta

- Crear una venta nueva o cobrar una cita existente.
- Agregar servicios y, en una fase posterior, productos.
- Asignar un empleado a cada concepto vendido.
- Seleccionar un cliente existente o crear uno durante el cobro.
- Aplicar descuentos con permisos y motivo obligatorio.
- Manejar uno o varios métodos de pago.
- Efectivo, tarjeta, transferencia y giftcard como métodos iniciales.
- Calcular subtotal, impuestos, descuentos, total pagado y cambio.
- Generar folio y comprobante imprimible o PDF.
- Consultar, editar con restricciones, cancelar o reembolsar una venta.
- Resumen por periodo, sucursal, empleado y método de pago.

### 5.13 Giftcards

- Creación de tarjetas con código único, saldo inicial y fecha de vencimiento.
- Asociación opcional con un cliente.
- Consulta y validación de saldo.
- Uso total o parcial durante una venta.
- Historial inalterable de cargos, devoluciones y ajustes.
- Restricción por empresa y, opcionalmente, por sucursal.

### 5.14 Caja

- Apertura de caja con fondo inicial.
- Registro de ingresos y retiros con categoría, motivo y responsable.
- Corte y cierre de caja.
- Conciliación por método de pago.
- Historial de movimientos y diferencias.
- Permisos especiales para modificar o cancelar movimientos.

### 5.15 Comisiones y nómina operativa

- Reglas de comisión por empleado, servicio o categoría.
- Cálculo por periodo a partir de ventas cobradas.
- Deducciones o ajustes autorizados.
- Resumen por empleado y sucursal.
- Reporte descargable para apoyar el proceso de nómina.

> La plataforma calculará información operativa de pago; la dispersión bancaria, obligaciones fiscales y timbrado de nómina se consideran integraciones independientes.

### 5.16 Reportes

- Ventas por fecha, empresa, sucursal, empleado, servicio y método de pago.
- Citas por estado, origen y periodo.
- Ocupación y utilización de agenda.
- Cancelaciones y ausencias.
- Clientes frecuentes y nuevos clientes.
- Servicios más vendidos.
- Comisiones y movimientos de caja.
- Exportación a CSV y generación de documentos PDF prioritarios.

### 5.17 Configuración

- Datos generales e identidad visual de cada empresa.
- Zona horaria, moneda, impuestos y formato de folios.
- Intervalos y reglas de agenda.
- Políticas de reservación, cancelación y servicio.
- Textos de confirmación para clientes.
- Métodos de pago disponibles.
- Catálogos de estados, motivos y etiquetas donde sea conveniente.

---

## 6. Reglas críticas del calendario

Para proteger la integridad de la agenda, la disponibilidad no dependerá únicamente de lo mostrado en el navegador.

- El servidor volverá a comprobar la disponibilidad al crear o mover una cita.
- La base de datos aplicará transacciones para impedir dobles reservas concurrentes.
- La duración se calculará a partir de los servicios y ajustes configurados.
- Una cita deberá encontrarse dentro del horario válido de la sucursal y del empleado.
- Se respetarán descansos, ausencias, cierres, días festivos y bloqueos.
- El empleado deberá estar asignado a la sucursal y autorizado para los servicios elegidos.
- Los cambios de horario, empleado o estado quedarán en una bitácora.
- Las fechas se almacenarán de forma normalizada y se mostrarán en la zona horaria de la empresa o sucursal.

---

## 7. Arquitectura tecnológica propuesta

### Aplicación web

- **Next.js con App Router y TypeScript** para interfaz, renderizado del servidor y endpoints de la aplicación.
- **Tailwind CSS** para estilos y sistema visual adaptable.
- **shadcn/ui** como base de componentes accesibles y personalizables.
- Componentes de servidor para lecturas y carga inicial; componentes de cliente solo en las áreas interactivas, especialmente el calendario y el punto de venta.
- Formularios tipados y validación compartida entre cliente y servidor.

### Base de datos

Se recomienda **PostgreSQL administrado** como base principal.

PostgreSQL es más conveniente que una base documental para este proyecto porque citas, empleados, servicios, sucursales, ventas y pagos mantienen relaciones fuertes y requieren transacciones confiables. Además, permite índices avanzados, restricciones, consultas por rango de tiempo y mecanismos para prevenir traslapes de citas.

La velocidad dependerá principalmente del diseño de consultas e índices, no solo del proveedor. Se contemplan:

- Índices compuestos comenzando por `company_id`.
- Índices por sucursal, empleado, fecha y estado.
- Paginación desde el servidor.
- Consultas agregadas optimizadas para tableros y reportes.
- Pool de conexiones compatible con despliegues serverless.
- Caché opcional con Redis para disponibilidad, sesiones limitadas, rate limiting y datos de lectura frecuente; PostgreSQL seguirá siendo la fuente de verdad.

### Acceso a datos y API

- ORM tipado, preferentemente **Drizzle ORM**; Prisma también es viable si el equipo lo estandariza.
- Acceso a datos exclusivo desde el servidor.
- Servicios o módulos de dominio para citas, ventas, caja y permisos.
- API interna mediante Route Handlers y acciones del servidor según el caso.
- Webhooks firmados para futuras integraciones.

### Autenticación y autorización

- Biblioteca de autenticación compatible con Next.js y sesiones persistentes.
- Contraseñas almacenadas exclusivamente como hashes robustos.
- Verificación de empresa, sucursal, rol y permiso en cada operación protegida.
- Posibilidad de añadir inicio de sesión social o empresarial más adelante.

### Infraestructura sugerida

- Aplicación Next.js en una plataforma administrada compatible con Node.js.
- PostgreSQL administrado en una región cercana a la mayoría de usuarios.
- Almacenamiento de objetos para logotipos, fotografías y comprobantes.
- Servicio transaccional de correo para invitaciones y confirmaciones.
- Monitoreo de errores, métricas, trazas y copias de seguridad automáticas.

La selección final de proveedores se realizará considerando ubicación de usuarios, presupuesto, residencia de datos y volumen esperado.

---

## 8. Modelo de datos de alto nivel

Las entidades principales serán:

- Empresa.
- Membresía de usuario en empresa.
- Rol y permiso.
- Sucursal.
- Usuario.
- Cliente.
- Empleado.
- Asignación de empleado a sucursal.
- Horario y excepción de horario.
- Categoría.
- Servicio.
- Habilidad o servicio por empleado.
- Cita.
- Detalle de cita.
- Historial de cita.
- Bloqueo de agenda.
- Venta.
- Detalle de venta.
- Pago.
- Giftcard y movimientos de saldo.
- Caja, sesión y movimiento de caja.
- Regla y cálculo de comisión.
- Configuración de empresa.
- Archivo.
- Notificación.
- Bitácora de auditoría.

Los borrados de información operativa importante serán preferentemente lógicos. Ventas, pagos y movimientos financieros conservarán trazabilidad mediante cancelaciones o movimientos compensatorios.

---

## 9. Experiencia de usuario

- Diseño adaptable a computadora y tableta; versión móvil para consultas y operaciones esenciales.
- Menú lateral dinámico según permisos.
- Tablas con búsqueda, filtros, paginación y estados visuales.
- Formularios con modos de alta, consulta y edición.
- Confirmaciones explícitas para operaciones delicadas.
- Estados de carga, mensajes de error comprensibles y retroalimentación inmediata.
- Navegación por teclado y componentes con criterios de accesibilidad.
- Interfaz neutra y personalizable, sin referencias obligatorias a un giro comercial específico.

---

## 10. Seguridad y confiabilidad

- Separación lógica obligatoria de datos por empresa.
- Validación de entradas en servidor.
- Protección CSRF cuando corresponda, cookies seguras y políticas de contenido.
- Rate limiting en acceso, recuperación de contraseña y reserva pública.
- Cifrado en tránsito y cifrado administrado en almacenamiento.
- Principio de mínimo privilegio para usuarios y servicios.
- Bitácora de accesos y cambios sensibles.
- Respaldos automáticos y procedimiento de restauración.
- Dependencias actualizadas y análisis de vulnerabilidades.
- Pruebas específicas para evitar fugas de información entre empresas.

---

## 11. Rendimiento y escalabilidad

- Carga inicial del calendario limitada a una sucursal y un día.
- Obtención incremental de datos al cambiar de fecha o sucursal.
- Actualizaciones optimistas únicamente cuando puedan revertirse con seguridad.
- Procesos pesados —PDF, exportaciones y notificaciones— ejecutados en segundo plano cuando el volumen lo justifique.
- Archivos servidos desde almacenamiento de objetos y CDN.
- Métricas para identificar consultas lentas y cuellos de botella.
- Posibilidad de escalar la aplicación horizontalmente sin cambiar el modelo funcional.

Metas iniciales sujetas a validación mediante pruebas de carga:

- Respuesta de operaciones comunes del servidor por debajo de 500 ms en condiciones normales.
- Navegación percibida fluida en el calendario diario.
- Disponibilidad objetivo acorde al nivel de servicio contratado con los proveedores.

---

## 12. Alcance recomendado por etapas

### Etapa 1 — Descubrimiento y diseño

- Talleres de reglas de negocio.
- Definición de roles y matriz de permisos.
- Flujos, arquitectura de información y prototipo del calendario.
- Modelo de datos y criterios de aceptación.

**Duración estimada:** 1 a 2 semanas.

### Etapa 2 — Núcleo multiempresa

- Inicio de sesión, recuperación de contraseña y sesiones.
- Empresas, membresías, roles y permisos.
- Sucursales, usuarios y configuración general.
- Base visual y navegación.

**Duración estimada:** 2 a 3 semanas.

### Etapa 3 — Catálogos y agenda

- Clientes, empleados, horarios, categorías y servicios.
- Calendario diario por empleado.
- Creación, edición, reprogramación, bloqueos y validación de disponibilidad.
- Listado de citas.

**Duración estimada:** 4 a 5 semanas.

### Etapa 4 — Reserva pública y operación comercial

- Flujo público de reservación.
- Ventas, pagos y comprobantes.
- Giftcards y caja.

**Duración estimada:** 3 a 4 semanas.

### Etapa 5 — Reportes, comisiones y liberación

- Tablero, reportes y exportaciones prioritarias.
- Cálculo de comisiones.
- Pruebas integrales, rendimiento, seguridad, capacitación y despliegue.

**Duración estimada:** 2 a 3 semanas.

### Estimación global

El alcance descrito requiere aproximadamente **12 a 17 semanas** para una primera versión productiva, dependiendo del detalle final de permisos, reglas de venta, reportes, migración de datos e integraciones. La estimación deberá confirmarse después de la etapa de descubrimiento.

---

## 13. MVP recomendado

Para reducir tiempo y riesgo, la primera liberación debería incluir:

- Plataforma multiempresa y aislamiento de datos.
- Acceso, usuarios, roles y permisos base.
- Empresas y sucursales.
- Clientes, empleados, horarios, categorías y servicios.
- Calendario diario con una columna por empleado.
- Alta, edición, reprogramación y estados de citas.
- Bloqueos, descansos y prevención de traslapes.
- Reserva pública básica.
- Conversión de cita a venta.
- Cobro con métodos de pago básicos.
- Apertura, movimientos y cierre de caja.
- Panel y reportes operativos esenciales.
- Comprobantes PDF y exportaciones esenciales.

Giftcards avanzadas, nómina completa, productos e inventario, pagos en línea, WhatsApp, facturación electrónica, aplicación móvil y analítica avanzada pueden liberarse en iteraciones posteriores si no son indispensables para el arranque.

---

## 14. Entregables

- Documento funcional y criterios de aceptación acordados.
- Diseño de experiencia e interfaz para los flujos prioritarios.
- Aplicación web responsiva.
- Código fuente versionado.
- Esquema y migraciones de base de datos.
- Configuración de ambientes de desarrollo, pruebas y producción.
- Pruebas automatizadas prioritarias.
- Manual breve de administración y operación.
- Capacitación de usuarios administradores.
- Despliegue inicial y acompañamiento de salida.

---

## 15. Estrategia de pruebas

- Pruebas unitarias de cálculos, permisos y reglas de disponibilidad.
- Pruebas de integración para citas, ventas, pagos, caja y giftcards.
- Pruebas de extremo a extremo de los recorridos principales.
- Pruebas de concurrencia para evitar dobles reservas.
- Pruebas de aislamiento entre empresas.
- Pruebas visuales y de usabilidad del calendario.
- Pruebas de respaldo y restauración antes de producción.
- Validación de aceptación con usuarios designados por el cliente.

---

## 16. Supuestos

- El cliente designará responsables para validar reglas y entregables.
- Se proporcionarán oportunamente logotipos, textos legales, catálogos y datos iniciales.
- La primera versión será una aplicación web; no incluye aplicaciones nativas para iOS o Android.
- Los costos de infraestructura, correo, mensajería, almacenamiento, dominios y servicios de terceros se cotizarán por separado.
- Las integraciones fiscales, bancarias, de terminal física o de mensajería dependerán de la disponibilidad y costo de sus proveedores.
- La migración desde sistemas existentes se estimará al conocer su formato, volumen y calidad.
- Los tiempos contemplan ciclos de revisión y aprobación definidos al inicio del proyecto.

---

## 17. Fuera de alcance inicial

Salvo que se contraten expresamente, no se incluyen en la primera versión:

- Aplicaciones móviles nativas.
- Facturación electrónica o timbrado de nómina.
- Inventario avanzado y compras a proveedores.
- Contabilidad formal.
- Terminal bancaria física.
- Marketplace entre empresas.
- Integraciones con WhatsApp, SMS o plataformas externas.
- Pagos en línea y manejo directo de datos de tarjeta.
- Migraciones masivas no analizadas.
- Desarrollo de hardware o funcionamiento sin conexión.

---

## 18. Criterios generales de aceptación

La solución se considerará lista para liberación cuando:

- Un usuario solo pueda acceder a empresas y sucursales autorizadas.
- Los datos de una empresa no sean visibles para otra.
- El calendario muestre correctamente un día y una columna por empleado.
- Sea posible crear, mover, editar, cancelar y completar citas conforme a permisos.
- El sistema impida traslapes no permitidos y respete horarios y bloqueos.
- La reserva pública solo ofrezca horarios realmente disponibles.
- Una cita pueda convertirse en venta sin volver a capturar la información principal.
- Los totales, pagos, movimientos de caja y saldos de giftcard sean consistentes.
- Los flujos prioritarios funcionen en los navegadores y dispositivos acordados.
- Se hayan completado las pruebas de aislamiento multiempresa y aceptación del cliente.

---

## 19. Inversión y condiciones comerciales

La inversión se definirá después de confirmar el alcance funcional, las integraciones, el volumen esperado, la migración de datos y el esquema de soporte.

La cotización final deberá separar al menos:

- Análisis, diseño y desarrollo.
- Infraestructura y servicios de terceros.
- Migración o carga inicial de datos.
- Capacitación y salida a producción.
- Soporte, mantenimiento y mejoras posteriores.

Se recomienda contratar el proyecto por etapas, con entregables demostrables y aceptación al cierre de cada una.

---

## 20. Evolución futura

La arquitectura quedará preparada para incorporar:

- Recordatorios por correo, SMS o WhatsApp.
- Anticipos y pagos en línea.
- Planes, suscripciones y membresías.
- Productos e inventario.
- Lista de espera y reservas recurrentes.
- Recursos adicionales como salas, equipos o vehículos.
- Facturación electrónica.
- Nómina e integraciones contables.
- Programa de lealtad y campañas.
- Panel avanzado de indicadores.
- API pública e integraciones con terceros.
- Aplicación móvil para clientes y empleados.

---

## 21. Conclusión

La propuesta transforma el sistema descrito originalmente para un giro específico en una plataforma multiempresa reutilizable y escalable. Su núcleo será la agenda diaria por empleado, acompañada de una estructura sólida de empresas, sucursales, permisos, servicios, clientes, ventas y caja.

El uso de Next.js, TypeScript, Tailwind CSS, shadcn/ui y PostgreSQL permitirá construir una experiencia moderna con una base transaccional confiable. La ejecución por etapas facilitará validar primero la operación esencial y añadir capacidades comerciales avanzadas conforme exista uso real del sistema.
