import { activityId } from './plannerTime';

// Exporta con la estructura del planificador de referencia: { order, activities }
export function planToJson(plan) {
  const isOrder = (plan.tipo || 'Plantilla') === 'Orden';
  return {
    order: isOrder
      ? {
          reference: plan.order_reference || plan.codigo || '',
          product: plan.product_name || '',
          quantity: Number(plan.quantity) || 0,
          start: plan.hito_fecha || '',
        }
      : undefined,
    nombre: plan.nombre,
    codigo: plan.codigo,
    tipo: plan.tipo || 'Plantilla',
    linea: plan.room_layout_name || '',
    familias: plan.familias || [],
    hito: plan.hito_nombre || 'Inicio de producción',
    activities: (plan.actividades || []).map((a) => {
      const offset = Number(a.offset_minutos) || 0;
      return {
        id: a.id,
        name: a.nombre,
        phase: offset < 0 ? 'pre' : 'post',
        offsetMinutes: offset,
        durationMinutes: Number(a.duracion_minutos) || 0,
        responsible: a.responsable || '',
        kind: a.kind || a.tipo || 'process',
        machine: a.maquina_nombre || a.estacion_nombre || '',
      };
    }),
    version: plan.version,
    status: plan.status,
    exportado_el: new Date().toISOString(),
  };
}

export function exportPlanJson(plan) {
  const payload = planToJson(plan);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const base = (plan.order_reference || plan.codigo || plan.nombre || 'diagrama-proceso')
    .toString()
    .replace(/[^\w-]+/g, '_');
  link.href = url;
  link.download = `${base}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function extractActivities(raw) {
  const source = Array.isArray(raw.activities)
    ? raw.activities
    : Array.isArray(raw.actividades)
      ? raw.actividades
      : [];

  return source.map((item, index) => {
    const offset = Number(item.offsetMinutes ?? item.offset_minutos ?? 0) || 0;
    return {
      id: item.id || activityId(),
      orden: index + 1,
      nombre: item.name || item.nombre || '',
      tipo: item.kind || item.tipo || 'Proceso',
      kind: item.kind || '',
      fase: item.phase === 'pre' || offset < 0 ? 'Preparación' : 'Producción',
      unidad: item.unidad || 'Minutos',
      estacion_element_id: item.estacion_element_id || '',
      estacion_nombre: item.estacion_nombre || '',
      maquina_id: item.maquina_id || '',
      maquina_nombre: item.maquina_nombre || item.machine || '',
      duracion_minutos: Number(item.durationMinutes ?? item.duracion_minutos ?? 0) || 0,
      offset_minutos: offset,
      responsable: item.responsible || item.responsable || '',
      notas: item.notas || '',
    };
  });
}

// Devuelve un payload listo para crear ArticleProcessPlan
export function parsePlanJson(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El archivo no contiene un objeto JSON válido');
  }
  const order = raw.order || null;
  const actividades = extractActivities(raw);
  const tipo = order ? 'Orden' : 'Plantilla';

  const referencia = order?.reference || raw.codigo || '';
  const producto = order?.product || '';

  return {
    tipo,
    nombre:
      raw.nombre ||
      (order
        ? `${referencia || 'Orden'}${producto ? ` · ${producto}` : ''}`
        : 'Diagrama importado'),
    codigo: raw.codigo || referencia || '',
    descripcion: raw.descripcion || '',
    room_layout_id: '',
    room_layout_name: raw.linea || raw.room_layout_name || '',
    process_id: '',
    process_name: raw.process_name || '',
    order_reference: referencia,
    product_name: producto,
    quantity: Number(order?.quantity ?? raw.quantity ?? 0) || 0,
    hito_fecha: order?.start || raw.hito_fecha || '',
    source_plan_id: '',
    source_plan_name: '',
    familias: raw.familias || [],
    linked_articles: [],
    hito_nombre: raw.hito || raw.hito_nombre || 'Inicio de producción',
    actividades,
    status: 'Borrador',
    version: 1,
    notes: '',
  };
}