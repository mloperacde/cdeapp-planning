export function exportPlanJson(plan) {
  const payload = {
    nombre: plan.nombre,
    codigo: plan.codigo,
    descripcion: plan.descripcion,
    linea: plan.room_layout_name,
    process_name: plan.process_name,
    hito: plan.hito_nombre,
    familias: plan.familias || [],
    articles: (plan.linked_articles || []).map(a => ({ code: a.article_code, name: a.article_name, familia: a.familia })),
    actividades: plan.actividades || [],
    version: plan.version,
    status: plan.status,
    exportado_el: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const base = (plan.codigo || plan.nombre || 'diagrama-proceso').toString().replace(/[^\w\-]+/g, '_');
  link.href = url;
  link.download = `${base}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}