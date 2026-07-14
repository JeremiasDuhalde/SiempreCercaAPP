# Proyecto: Implementación Odoo 19 — "Siempre Cerca SRL"

## Rol
Actuá como ingeniero de implementación de Odoo 19. Vas a configurar y
personalizar una instancia Odoo ya existente para el cliente Siempre Cerca SRL
(servicio de enfermería/asistencia con modelo de asociados, Argentina), sin
romper datos.

## Conexión
- URL: https://siempre-cerca-srl.odoo.com
- Usuario: administración@siemprecercasrl.com
- Contraseña: leela de la variable de entorno ODOO_PASSWORD (NO la hardcodees ni la imprimas en logs)
- Base de datos: detectala (suele ser el subdominio: siempre-cerca-srl)
- Conectate vía la API externa de Odoo (XML-RPC o JSON-RPC). Usá Python
  reutilizable e idempotente (odoorpc o xmlrpc.client).

## Reglas de trabajo
1. PRIMERO: conectá, autenticá y hacé un relevamiento: versión exacta, edición
   (Online/Enterprise/.sh), módulos instalados, usuarios, compañías, locale.
   Reportámelo ANTES de tocar nada.
2. Detectá si la instancia permite módulos custom (Python) o si es Odoo Online
   (solo config nativa + Studio). Si es Online, marcá qué tareas requieren Studio
   manual o migración a Odoo.sh y no intentes instalar código.
3. Priorizá configuración nativa; custom solo lo estrictamente necesario.
4. Trabajá por fases; al cerrar cada una, resumí hecho/pendiente.
5. Pedí confirmación antes de cualquier acción destructiva.
6. Scripts idempotentes (re-ejecutables sin duplicar) y con logging claro.
7. Localización contable argentina (ARCA, libros IVA) está FUERA de alcance.
8. Hay un único usuario con todas las apps activas; respetalo salvo indicación.

## Apps a habilitar/configurar
CRM, Ventas, Suscripciones (cobros recurrentes), Contactos, Facturación,
Inventario, Alquiler (equipos médicos), Compras (con aprobaciones), Empleados,
Ausencias/Vacaciones, Reclutamiento, Evaluaciones, Partes de horas, Sign
(firma electrónica), WhatsApp Business, Email Marketing, Chat en vivo, Discuss,
Sitio Web + Portal, Documentos, Encuestas, Calendario, Soporte/Helpdesk.

## Alcance funcional
### Asociados
- Numeración automática secuencial al alta (ir.sequence sobre el modelo de contacto).
- Ficha completa, estados de cuenta y morosidad (vinculado a facturación).
- Seguimiento de consultas y trazabilidad de toda acción (fecha/hora/usuario): chatter + log de auditoría.

### Rendimiento de empleados
- Panel individual: asociados cargados, activos, en mora, historial, comisiones.
- Panel general/KPIs: asociados activos, mora, recaudación mensual, deuda acumulada, pagos por método.
- Comisiones automáticas por empleado según asociados cargados/activos (acciones automatizadas + campos computados).

### Reportes y gobierno de datos
- Reportes automáticos: ingresos, morosidad, altas/bajas, rendimiento por empleado.
- Exportación a Excel, permisos por usuario (grupos/roles), historial de cambios (tracking fields + log), backups automáticos (nativo si es .sh).

### Inventario / compras / alquiler
- Inventario de insumos + maquinarias alquiladas.
- Compras con niveles de aprobación. Flujo de alquiler de equipos médicos.

### Comunicación, portal y firma
- Portal de autoservicio para enfermeros/asociados.
- WhatsApp Business (templates), Email Marketing, Chat en vivo.
- Firma electrónica de recibos/documentos. Suscripciones / facturación recurrente.

## Desarrollos custom (mínimos)
1. Panel de Asociados: Kanban/lista con número secuencial, morosidad, deuda
   acumulada, estado. Campos computados + vistas XML sobre contactos.
2. Dashboard de empleados: KPIs por empleado (reporting nativo + Qweb).
3. Automatización de comisiones (acciones automatizadas + campos computados).
4. Reportes PDF/Excel (morosidad, rendimiento, inventario) en Qweb nativo.
> Si es Odoo Online sin módulos custom: hacé lo posible con Studio/automatizaciones
  nativas y documentá explícitamente qué queda para Studio manual o Odoo.sh.

## Orden de ejecución sugerido
1. Relevamiento + reporte de capacidades.
2. Compañía, usuarios, roles/permisos, portales.
3. Asociados, productos, pipeline comercial.
4. Inventario, almacenes, alquiler de equipos.
5. Compras con aprobaciones.
6. Secuencia automática de asociados + campos computados + vistas.
7. KPIs/paneles + comisiones automáticas.
8. Tracking/auditoría.
9. HR (empleados, ausencias, reclutamiento, timesheets, evaluaciones).
10. Portal + WhatsApp + soporte.
11. Suscripciones + facturación + Sign.
12. Reportes (morosidad, rendimiento, inventario).

## Entregables
- Scripts/módulos versionados, idempotentes.
- README: qué se configuró, cómo re-ejecutar, qué quedó pendiente.
- Checklist de validación por flujo.
