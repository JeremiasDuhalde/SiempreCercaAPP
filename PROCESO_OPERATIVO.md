# Proceso Operativo — Siempre Cerca SRL

## Resumen general

El proceso central del negocio es la **gestión integral de prestaciones de
enfermería/asistencia a domicilio**, desde que se deriva un paciente hasta la
facturación a la obra social/ART y la liquidación al prestador.

---

## 1. Derivación del paciente (inicio del proceso)

Una empresa (obra social, ART, prepaga) **deriva un paciente** con
requerimientos específicos de cobertura (tipo de prestación, frecuencia,
cantidad de sesiones).

Al recibir la derivación se evalúa:

- **Hay prestadores disponibles en la zona del paciente?**
  - **SI** → se asignan directamente.
  - **NO** → se buscan prestadores nuevos, se los carga en el sistema y se los
    asocia a la ficha del paciente.

---

## 2. Carga del paciente

Se crea la ficha del paciente con todos sus datos personales:

- Nombre, DNI, domicilio, contacto, obra social/ART, nro. de afiliado
- Diagnóstico / requerimientos de cobertura
- Empresa derivante

**Estado resultante:** Paciente cargado.

---

## 3. Carga de prestadores

Los prestadores (enfermeros, profesionales) que van a domicilio se cargan con:

- Datos personales y de contacto
- Documentación requerida por la empresa (varía según entidad)
- **Legajo digital:** PDFs adjuntos en la ficha del sistema con títulos claros
  (matrícula, habilitación, seguro, etc.)
- Zona de cobertura / disponibilidad

---

## 4. Orden del paciente (pantalla de orden)

Desde la ficha del paciente se accede a la **orden**, que contiene:

### 4.1 Código de autorización
- Campo **alfanumérico** (las ART y obras sociales usan formatos variados)
- Identifica la autorización de la empresa para la cobertura

### 4.2 Prestaciones y profesionales asignados
- Se agregan las prestaciones que el paciente puede recibir
- A cada prestación se le asocia un **prestador** (cargado previamente)
- Se carga manualmente el **importe por prestación** (valor compra al prestador)

### 4.3 Grilla de valores (precios de referencia)
- Si la orden tiene código de autorización → se aplica una **grilla
  preestablecida** de la empresa/obra social
- Si es un **presupuesto** → los valores se cargan manualmente
- Las grillas se cargan por separado (configuración de valores por empresa)
- Al cargar los datos del paciente y su obra social, el sistema muestra
  automáticamente el valor de referencia de la prestación según la grilla

### 4.4 Valores en la orden
- **Valor venta:** lo que se factura a la empresa (según grilla)
- **Valor compra:** lo que se paga al prestador (convenido)
- **Cantidad de sesiones** autorizadas
- Frecuencia de la prestación

### 4.5 Notificación al prestador
- Botón que envía un **email automático** (solicitud de servicio) al prestador
- Contenido del email: nombre del paciente, prestación a cubrir, frecuencia,
  cantidad de sesiones y valores convenidos
- Objetivo: dejar constancia formal de lo acordado, evitar facturaciones
  indebidas y malos entendidos

---

## 5. Cierre de mes — Control de prestaciones

Al cierre del período se verifica:

- Qué prestaciones se cubrieron efectivamente
- Si se cubrieron en su **totalidad** o parcialmente
- Diferencias entre lo autorizado y lo realizado

---

## 6. Liquidación al prestador

En una pantalla separada se liquida al prestador:

- Se calcula en base a lo **efectivamente prestado** (no lo autorizado)
- Se genera la liquidación con el detalle de prestaciones realizadas
- Se cruza con lo convenido originalmente (valores de compra de la orden)

---

## 7. Facturación a la empresa

### 7.1 Preparación
- Se verifica que toda la documentación esté conforme para evitar **débitos**
- Las plantillas de facturación se confeccionan según la **normativa de cada
  entidad**

### 7.2 Modalidad de facturación (depende del convenio)
- **Factura por paciente:** una factura individual por cada paciente
- **Factura general:** una sola factura que agrupa todos los pacientes de esa
  obra social

### 7.3 Condición impositiva (se define al cargar la empresa)
- Obligatorio / No obligatorio
- Exento / No exento
- IVA 10,5% / 21% / etc.

### 7.4 Proceso
1. Se confecciona la factura según la modalidad
2. Se chequea lo realizado vs. lo confeccionado
3. Se emite la factura a la empresa
4. Se registra el estado (emitida, cobrada, con débito, etc.)

---

## Resumen del flujo

```
Derivación del paciente
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│ Carga del        │     │ Carga/búsqueda   │
│ paciente         │     │ de prestadores   │
│ (ficha + datos)  │     │ (legajo digital) │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
          ┌─────────────────────┐
          │ Orden del paciente  │
          │ - Código autoriz.   │
          │ - Prestaciones      │
          │ - Prestador asignado│
          │ - Valores (V/C)     │
          │ - Email al prestador│
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Ejecución mensual   │
          │ (prestaciones       │
          │  realizadas)        │
          └──────────┬──────────┘
                     │
            ┌────────┴────────┐
            ▼                 ▼
   ┌────────────────┐ ┌────────────────┐
   │ Liquidación    │ │ Facturación    │
   │ al prestador   │ │ a la empresa   │
   │ (valor compra) │ │ (valor venta)  │
   └────────────────┘ └────────────────┘
```

---

## Mapeo a módulos Odoo 19

| Paso del proceso | Módulo Odoo | Notas |
|---|---|---|
| Ficha del paciente | **Contactos** (res.partner) | Tipo "paciente", campos custom (DNI, afiliado, diagnóstico, obra social) |
| Ficha del prestador | **Contactos** (res.partner) | Tipo "prestador", campos custom (matrícula, zona) + **Documentos** para legajo digital (PDFs adjuntos) |
| Empresa / obra social | **Contactos** (res.partner) | Tipo "empresa", con config de condición impositiva y modalidad de facturación |
| Grillas de valores por empresa | **Listas de precios** (product.pricelist) | Una lista de precios por empresa/obra social con los valores de cada prestación |
| Orden del paciente | **Ventas** (sale.order) | Orden de venta con líneas = prestaciones. Campos custom: código de autorización (alfanumérico), prestador asignado por línea |
| Prestaciones (catálogo) | **Productos** (product.template) | Tipo "servicio". Cada prestación es un producto (enfermería 24h, kinesiología, etc.) |
| Email al prestador | **Discuss / Email** | Template de email "Solicitud de servicio" disparado con botón desde la orden |
| Control de ejecución mensual | **Partes de horas** (timesheet) o campo custom en líneas de orden | Registro de lo efectivamente realizado vs. autorizado |
| Liquidación al prestador | **Compras** (purchase.order) | Orden de compra al prestador por lo realizado. Valor = precio de compra convenido |
| Facturación a la empresa | **Facturación** (account.move) | Factura desde la orden de venta. Soporta factura por paciente o agrupada |
| Condición IVA | **Facturación** (posición fiscal) | Posiciones fiscales: exento, 10.5%, 21%, etc. Se asigna a la empresa |
| Seguimiento cobros/débitos | **Facturación** (seguimiento de pagos) | Estados de factura + reportes de deuda |
| Documentación / legajo | **Documentos** (documents) | Workspace "Legajos" con carpetas por prestador |
| Reportes | **Reportes nativos + Studio** | Prestaciones realizadas, liquidaciones, facturación, morosidad |
