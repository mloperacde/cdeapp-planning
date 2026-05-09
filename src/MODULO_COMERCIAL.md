# Módulo Comercial - Documentación

## Descripción General

El módulo comercial es un sistema completo para la gestión de presupuestos y cotizaciones en una empresa de envasado por contrato para terceros. Permite crear, gestionar y seguir presupuestos para diferentes tipos de productos (cosméticos, perfumería, sanitarios y alimenticios).

## Características Principales

### 1. Dashboard Comercial
- **Acceso**: `/CommercialDashboard`
- **Funcionalidades**:
  - Resumen de KPIs (Total presupuestos, estados, ingresos)
  - Listado de presupuestos recientes
  - Acceso rápido a funcionalidades principales
  - Estadísticas en tiempo real

### 2. Generador de Presupuestos
- **Acceso**: `/QuoteGenerator`
- **Descripción**: Asistente de 4 pasos para crear presupuestos

#### Paso 1: Datos del Cliente y Tipo de Presupuesto
- Información del cliente (nombre, email, teléfono, empresa)
- Selección del tipo de presupuesto:
  - **SOLO SERVICIO DE ENVASADO**: Solo incluye el servicio de envasado, etiquetado y procesamiento. El cliente proporciona los materiales.
  - **SERVICIO 360**: Incluye envasado + suministro de materiales + distribución.

#### Paso 2: Especificaciones de Envasado
- Tipo de producto (cosmético, perfumería, sanitario, alimenticio)
- Volumen de unidades a envasar
- Tipo de envase (frasco, bote, blíster, cartón, bolsa)
- Sistema de llenado (bomba peristáltica, pistón, masa, volumétrica)
- Sistema de etiquetado (manual, semiautomático, automático)
- Sistema de taponado (manual, semiautomático, automático)
- Línea de producción (línea completa o máquinas específicas)
- Requisitos especiales y normativas
- Plazo de entrega

#### Paso 3: Suministro de Materiales
- Solo aplica para **SERVICIO 360**
- Seleccionar materiales a suministrar:
  - Blísteres/Envases primarios
  - Tarjetas impresas
  - Tapones/Cierres
  - Bombas dosificadoras
  - Etiquetas impresas
  - Otros materiales
- Incluir distribución a puntos de venta/e-commerce

#### Paso 4: Revisión y Confirmación
- Resumen de todos los datos
- Notas adicionales
- Crear presupuesto en estado "borrador"

### 3. Gestión de Presupuestos
- **Acceso**: `/QuotesList`
- **Funcionalidades**:
  - Búsqueda por número, cliente o empresa
  - Filtrado por estado (Borrador, Enviado, Aprobado, Rechazado)
  - Filtrado por tipo (Envasado Solo, Servicio 360)
  - Ver detalle del presupuesto
  - Duplicar presupuesto
  - Eliminar presupuesto

### 4. Detalle del Presupuesto
- **Acceso**: `/QuoteDetail/:id`
- **Funcionalidades**:
  - Ver información completa del presupuesto
  - Cambiar estado (Borrador → Enviado → Aprobado/Rechazado)
  - Descargar PDF
  - Tablas con desglose de:
    - Información del cliente
    - Especificaciones de envasado
    - Materiales (si aplica)
    - Desglose de precios

### 5. Configuración de Precios
- **Acceso**: `/PricingConfiguration`
- **Descripción**: Gestionar tarifas y márgenes de ganancia

#### Variables Configurables
- **Nombre**: Identificador de la configuración
- **Tipo de Producto**: General, Cosmético, Perfumería, Sanitario, Alimenticio
- **Costo de Mano de Obra**: €/unidad
- **Tarifa Horaria**: €/hora de máquina
- **Margen de Ganancia**: Porcentaje
- **IVA**: Porcentaje de impuestos

#### Multiplicadores por Sistema
- Llenado (bomba peristáltica, pistón, masa, volumétrica)
- Etiquetado (manual, semiautomático, automático)
- Taponado (manual, semiautomático, automático)
- Tipo de envase

#### Descuentos por Volumen
- Configurar descuentos automáticos según rango de volumen

### 6. Reportes y Análisis
- **Acceso**: `/ReportingAnalytics`
- **Métricas**:
  - Total de presupuestos
  - Tasa de conversión (%)
  - Valor total aprobado
  - Valor promedio de presupuestos
  - Distribución por producto
  - Distribución por estado
  - Comparativa de tipos
  - Clientes principales

## Entidades de Base de Datos

### QuoteTemplate
```json
{
  "quote_number": "QUOTE-2024-001",
  "client_name": "Nombre del cliente",
  "client_email": "email@ejemplo.com",
  "client_phone": "+34 900 000 000",
  "client_company": "Nombre empresa",
  "quote_type": "ENVASADO_SOLO" | "SERVICIO_360",
  "product_type": "cosmetico" | "perfumeria" | "sanitario" | "alimenticio",
  "volume": 50000,
  "container_type": "frasco" | "bote" | "blister" | "carton" | "bolsa",
  "filling_system": "bomba_peristaltica" | "piston" | "masa" | "volumetrica",
  "labeling_system": "manual" | "semiautomatico" | "automatico",
  "capping_system": "manual" | "semiautomatico" | "automatico",
  "line_type": "linea_completa" | "maquinas_especificas",
  "selected_machines": [...],
  "special_requirements": "GMP, ISO 9001, BPF",
  "delivery_days": 30,
  "materials_supply": {
    "blisters": true,
    "printed_cards": true,
    "caps": true,
    "pumps": false,
    "labels": true,
    "other": "..."
  },
  "distribution_included": false,
  "price_breakdown": {
    "labor_cost": 1500,
    "machine_cost": 800,
    "material_cost": 2500,
    "distribution_cost": 0,
    "subtotal": 4800,
    "tax_percentage": 21,
    "total": 5808
  },
  "status": "borrador" | "enviado" | "aprobado" | "rechazado" | "cancelado",
  "notes": "Notas adicionales",
  "validity_days": 30
}
```

### PricingConfiguration
```json
{
  "config_name": "Cosméticos Estándar",
  "product_type": "cosmetico",
  "labor_cost_per_unit": 0.50,
  "hourly_rate": 45,
  "filling_system_multiplier": {
    "bomba_peristaltica": 1.0,
    "piston": 1.2,
    "masa": 0.8,
    "volumetrica": 0.95
  },
  "container_type_cost": {
    "frasco": 0.30,
    "bote": 0.25,
    "blister": 0.20,
    "carton": 0.15,
    "bolsa": 0.10
  },
  "labeling_multiplier": {
    "manual": 0.5,
    "semiautomatico": 1.0,
    "automatico": 1.5
  },
  "margin_percentage": 35,
  "tax_percentage": 21,
  "minimum_order_volume": 1000,
  "volume_discounts": [
    {
      "min_volume": 10000,
      "max_volume": 50000,
      "discount_percentage": 5
    },
    {
      "min_volume": 50001,
      "max_volume": 100000,
      "discount_percentage": 10
    }
  ]
}
```

## Flujo de Trabajo Típico

1. **Crear Presupuesto**
   - Ir a "Generador de Presupuestos"
   - Completar los 4 pasos del asistente
   - Guardar en estado "borrador"

2. **Revisar y Ajustar**
   - Acceder al presupuesto desde "Presupuestos"
   - Ver detalle completo
   - Realizar cambios si es necesario

3. **Enviar al Cliente**
   - Cambiar estado a "enviado"
   - Descargar PDF
   - Enviar por email

4. **Seguimiento**
   - Monitorizar estado del presupuesto
   - Cambiar a "aprobado" cuando se confirme
   - Usar reportes para análisis

## Cálculo de Precios

El sistema calcula automáticamente los precios basándose en:

1. **Costo de Mano de Obra**: `labor_cost_per_unit × volume`
2. **Costo de Máquinas**: `hourly_rate × (volume / capacity) × multiplicadores`
3. **Costo de Materiales**: `Aplicable solo en SERVICIO_360`
4. **Costo de Distribución**: `Aplicable solo si está incluido`
5. **Subtotal**: Suma de todos los costos
6. **Margen**: `Subtotal × (1 + margin_percentage/100)`
7. **IVA**: `Subtotal × tax_percentage/100`
8. **TOTAL**: Margen + IVA

## Permisos de Acceso

- **Administrador**: Acceso completo
- **Usuario Comercial**: Acceso a crear y gestionar presupuestos
- **Gerente**: Acceso a reportes y análisis

## Mejoras Futuras

- [ ] Integración con CRM
- [ ] Envío automático de PDF por email
- [ ] Aceptación de presupuestos en línea
- [ ] Generación automática de órdenes de producción
- [ ] Sincronización con sistema contable
- [ ] Historial de cambios en presupuestos
- [ ] Validación de disponibilidad de máquinas
- [ ] Cálculo dinámico de fechas de entrega

## Soporte

Para preguntas o reportar problemas, contactar al equipo de desarrollo.