/**
 * Motor de cálculo automático de presupuestos de maquila.
 * Genera líneas de servicio y precios según configuración.
 */

// Tarifas base por tipo de producto (coste unitario en €)
const BASE_RATES = {
  // Envasado técnico por textura
  filling: {
    liquido:   { min: 0.08, max: 0.18, default: 0.12 },
    crema:     { min: 0.18, max: 0.45, default: 0.28 },
    gel:       { min: 0.12, max: 0.30, default: 0.20 },
    polvo:     { min: 0.25, max: 0.55, default: 0.38 },
    solido:    { min: 0.30, max: 0.60, default: 0.45 },
    emulsion:  { min: 0.20, max: 0.40, default: 0.30 },
    spray:     { min: 0.15, max: 0.35, default: 0.22 },
    otro:      { min: 0.20, max: 0.50, default: 0.30 },
  },
  // Sachet / toallita tiene tarifa diferente
  sachet: {
    sachet:          { min: 0.05, max: 0.12, default: 0.08 },
    sachet_toallita: { min: 0.18, max: 0.40, default: 0.28 },
  },
  // Coste de etiquetado
  labeling: {
    manual:        0.12,
    semiautomatico: 0.06,
    automatico:    0.04,
  },
  // Codificación (lote/cad)
  coding: {
    inkjet:           0.03,
    laser:            0.04,
    termotransferencia: 0.04,
    manual:           0.05,
    ninguno:          0.00,
  },
  // Empaquetado secundario (estuche, flow pack...)
  packaging: {
    estuche:         0.18,
    flow_pack:       0.08,
    termoretractil:  0.06,
    film:            0.04,
    ninguno:         0.00,
    otro:            0.10,
  },
  // Gestión de materia prima / recepción QC
  material_handling: 0.08,
  // Final de línea / paletizado
  end_of_line: 0.04,
};

// Set-up fijo por tamaño de lote
function getSetupCost(volume) {
  if (volume < 1000) return 600;
  if (volume < 5000) return 450;
  if (volume < 20000) return 300;
  if (volume < 50000) return 200;
  return 150;
}

// Multiplicador por normativa
const REGULATORY_MULTIPLIER = {
  cosmetico:  1.00,
  perfumeria: 1.05, // ATEX
  sanitario:  1.20, // ISO 13485, sala blanca
  alimenticio: 1.10, // APPCC
  otro: 1.00,
};

// Margen por recargo de gestión de materiales (%)
const DEFAULT_MATERIALS_MARGIN = 15;

export function calculateQuote(formData) {
  const {
    volume = 0,
    product_type = 'cosmetico',
    product_texture = 'crema',
    container_type = 'frasco',
    filling_system,
    labeling_system = 'semiautomatico',
    coding_system = 'inkjet',
    packaging_type = 'ninguno',
    quote_type = 'ENVASADO_SOLO',
    materials_supply = {},
    distribution_included = false,
    distribution_cost = 0,
    quality_services = {},
  } = formData;

  if (!volume || volume <= 0) return null;

  const regMult = REGULATORY_MULTIPLIER[product_type] || 1.0;
  const lines = [];

  // ── PROD-01: Set-up / Puesta en marcha ─────────────────────────
  const setupCost = getSetupCost(volume);
  lines.push({
    code: 'PROD-01',
    concept: 'Puesta en marcha (Set-up)',
    description: 'Ajuste de línea, cambio de formatos y limpieza técnica',
    unit_cost: setupCost,
    quantity: 1,
    total: setupCost,
    is_fixed: true,
  });

  // ── ENV-01: Envasado técnico ────────────────────────────────────
  let fillingRate;
  if (container_type === 'sachet' || container_type === 'sachet_toallita') {
    fillingRate = (BASE_RATES.sachet[container_type]?.default || 0.15) * regMult;
  } else {
    const textureRates = BASE_RATES.filling[product_texture] || BASE_RATES.filling.otro;
    fillingRate = textureRates.default * regMult;
  }
  lines.push({
    code: 'ENV-01',
    concept: 'Envasado Técnico',
    description: `Llenado de ${product_texture} en ${container_type} — línea ${filling_system?.replace(/_/g, ' ') || 'automatizada'}`,
    unit_cost: fillingRate,
    quantity: volume,
    total: fillingRate * volume,
    is_fixed: false,
  });

  // ── ACAB-01: Cierre / Taponado ─────────────────────────────────
  const cappingRate = (container_type === 'sachet' || container_type === 'sachet_toallita') ? 0 : 0.05 * regMult;
  if (cappingRate > 0) {
    lines.push({
      code: 'ACAB-01',
      concept: 'Acabado y Cierre',
      description: 'Roscado, inducción, termosellado o inserción',
      unit_cost: cappingRate,
      quantity: volume,
      total: cappingRate * volume,
      is_fixed: false,
    });
  }

  // ── ETIQ-01: Etiquetado ────────────────────────────────────────
  const labelRate = (BASE_RATES.labeling[labeling_system] || 0.06) * regMult;
  lines.push({
    code: 'ETIQ-01',
    concept: 'Etiquetado',
    description: `Aplicación de etiqueta — sistema ${labeling_system?.replace(/_/g, ' ')}`,
    unit_cost: labelRate,
    quantity: volume,
    total: labelRate * volume,
    is_fixed: false,
  });

  // ── COD-01: Codificación Lote/Cad ──────────────────────────────
  const codingRate = BASE_RATES.coding[coding_system] || 0.03;
  if (codingRate > 0) {
    lines.push({
      code: 'COD-01',
      concept: 'Fijación de Lote/Caducidad',
      description: `Impresión ${coding_system?.replace(/_/g, ' ')}`,
      unit_cost: codingRate,
      quantity: volume,
      total: codingRate * volume,
      is_fixed: false,
    });
  }

  // ── PACK-01: Empaquetado secundario ────────────────────────────
  const packRate = (BASE_RATES.packaging[packaging_type] || 0) * regMult;
  if (packRate > 0) {
    lines.push({
      code: 'PACK-01',
      concept: 'Empaquetado Secundario',
      description: `${packaging_type?.replace(/_/g, ' ')} + paletizado`,
      unit_cost: packRate,
      quantity: volume,
      total: packRate * volume,
      is_fixed: false,
    });
  }

  // ── GMAT-01: Gestión de materia / Recepción QC ─────────────────
  const matHandlingRate = BASE_RATES.material_handling * regMult;
  lines.push({
    code: 'GMAT-01',
    concept: 'Gestión de Materia Prima',
    description: 'Recepción, control QC de envases y almacenamiento temporal',
    unit_cost: matHandlingRate,
    quantity: volume,
    total: matHandlingRate * volume,
    is_fixed: false,
  });

  // ── FDL-01: Final de línea ─────────────────────────────────────
  const endRate = BASE_RATES.end_of_line * regMult;
  lines.push({
    code: 'FDL-01',
    concept: 'Final de Línea',
    description: 'Estuchado, agrupado y paletizado para expedición',
    unit_cost: endRate,
    quantity: volume,
    total: endRate * volume,
    is_fixed: false,
  });

  // ── Totales de servicios ───────────────────────────────────────
  const setupTotal = lines.filter(l => l.is_fixed).reduce((s, l) => s + l.total, 0);
  const variableTotal = lines.filter(l => !l.is_fixed).reduce((s, l) => s + l.total, 0);
  const servicesSubtotal = setupTotal + variableTotal;

  // ── Materiales (SERVICIO_360) ──────────────────────────────────
  let materialsCost = 0;
  if (quote_type === 'SERVICIO_360') {
    const margin = (materials_supply.margen_gestion || DEFAULT_MATERIALS_MARGIN) / 100 + 1;
    const envase = (materials_supply.envase_primario && materials_supply.envase_primario_coste)
      ? materials_supply.envase_primario_coste * volume * margin : 0;
    const cierre = (materials_supply.cierre && materials_supply.cierre_coste)
      ? materials_supply.cierre_coste * volume * margin : 0;
    const etiqueta = (materials_supply.etiqueta && materials_supply.etiqueta_coste)
      ? materials_supply.etiqueta_coste * volume * margin : 0;
    const packaging_sec = (materials_supply.packaging_secundario && materials_supply.packaging_secundario_coste)
      ? materials_supply.packaging_secundario_coste * volume * margin : 0;
    const matPrima = (materials_supply.materia_prima && materials_supply.materia_prima_coste)
      ? materials_supply.materia_prima_coste * volume * margin : 0;
    materialsCost = envase + cierre + etiqueta + packaging_sec + matPrima;
  }

  // ── Calidad ────────────────────────────────────────────────────
  let qualityCost = 0;
  if (quality_services.microbiological_analysis) qualityCost += quality_services.microbiological_cost || 250;
  if (quality_services.stability_test) qualityCost += quality_services.stability_cost || 500;
  if (quality_services.regulatory_management) qualityCost += quality_services.regulatory_cost || 800;

  // ── Distribución ───────────────────────────────────────────────
  const distCost = distribution_included ? (distribution_cost || 0) : 0;

  // ── Totales finales ────────────────────────────────────────────
  const subtotal = servicesSubtotal + materialsCost + qualityCost + distCost;
  const taxPercentage = 21;
  const taxAmount = subtotal * taxPercentage / 100;
  const total = subtotal + taxAmount;
  const unitPrice = volume > 0 ? subtotal / volume : 0;

  return {
    service_lines: lines,
    price_breakdown: {
      setup_cost: setupTotal,
      services_subtotal: servicesSubtotal,
      materials_cost: materialsCost,
      quality_cost: qualityCost,
      distribution_cost: distCost,
      subtotal,
      tax_percentage: taxPercentage,
      tax_amount: taxAmount,
      total,
      unit_price: unitPrice,
    },
  };
}