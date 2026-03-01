export const SYSTEM_FIELDS = [
    { key: 'production_id', label: 'Production ID', aliases: ['production_id', 'id', 'PRODUCTION_ID'] },
    { key: 'machine_id_source', label: 'machine_id', aliases: ['machine_id', 'id_maquina', 'MACHINE_ID'] },
    { key: 'priority', label: 'Prioridad', aliases: ['priority', 'Prioridad', 'urgencia'] },
    { key: 'type', label: 'Tipo', aliases: ['type', 'Tipo', 'TIPO'] },
    { key: 'status', label: 'Estado', aliases: ['status', 'Estado', 'situacion', 'estatus'] },
    { key: 'room', label: 'Sala', aliases: ['room', 'Sala', 'SALA', 'Nave', 'Zona'] },
    { key: 'machine_name', label: 'Máquina', required: true, aliases: ['machine_name', 'Máquina', 'maquina', 'machine', 'recurso', 'MÁQUINA', 'MAQUINA', 'Sala / Máquina'] },
    { key: 'client_order_ref', label: 'Su Pedido', aliases: ['client_order_ref', 'Su Pedido'] },
    { key: 'internal_order_ref', label: 'Pedido', aliases: ['internal_order_ref', 'Pedido'] },
    { key: 'order_number', label: 'Orden', required: true, aliases: ['order_number', 'Orden', 'numero_orden', 'wo'] },
    { key: 'product_article_code', label: 'Artículo', aliases: ['product_article_code', 'Artículo', 'article', 'referencia'] },
    { key: 'product_name', label: 'Nombre', aliases: ['product_name', 'Nombre', 'Descripción', 'description'] },
    { key: 'article_status', label: 'Edo. Art.', aliases: ['article_status', 'Edo. Art.'] },
    { key: 'client_name', label: 'Cliente', aliases: ['client_name', 'Cliente', 'client', 'customer'] },
    { key: 'material', label: 'Material', aliases: ['material', 'Material'] },
    { key: 'product_family', label: 'Producto', aliases: ['product_family', 'Producto', 'product'] },
    { key: 'shortages', label: 'Faltas', aliases: ['shortages', 'Faltas'] },
    { key: 'quantity', label: 'Cantidad', aliases: ['quantity', 'Cantidad', 'qty'] },
    { key: 'effective_delivery_date', label: 'Fecha Entrega (Vigente)', aliases: [] },
    { key: 'committed_delivery_date', label: 'Fecha Entrega', aliases: ['committed_delivery_date', 'Fecha Entrega'] },
    { key: 'new_delivery_date', label: 'Nueva Fecha Entrega', aliases: ['new_delivery_date', 'Nueva Fecha Entrega'] },
    { key: 'delivery_compliance', label: 'Cumplimiento', aliases: ['delivery_compliance', 'Cumplimiento entrega'] },
    { key: 'multi_unit', label: 'MultUnid', aliases: ['multi_unit', 'MultUnid'] },
    { key: 'multi_qty', label: 'Mult x Cantidad', aliases: ['multi_qty', 'Mult x Cantidad'] },
    { key: 'production_cadence', label: 'Cadencia', aliases: ['production_cadence', 'Cadencia'] },
    { key: 'delay_reason', label: 'Motivo Retraso', aliases: ['delay_reason', 'Motivo Retraso'] },
    { key: 'components_deadline', label: 'Fec. limite comp.', aliases: ['components_deadline', 'Fecha limite componentes'] },
    { key: 'effective_start_date', label: 'Inicio (Vigente)', aliases: [] },
    { key: 'start_date', label: 'Fecha Inicio Limite', aliases: ['start_date', 'Fecha Inicio Limite'] },
    { key: 'modified_start_date', label: 'Fecha Inicio Modif.', aliases: ['modified_start_date', 'Fecha Inicio Modificada'] },
    { key: 'planned_end_date', label: 'Fecha Fin', aliases: ['planned_end_date', 'Fecha Fin'] },
    { key: 'notes', label: 'Observación', aliases: ['notes', 'Observación', 'notas'] }
];

export const extractValue = (obj, fieldDef) => {
    if (!obj) return undefined;
    if (obj[fieldDef.key] !== undefined && obj[fieldDef.key] !== null) return obj[fieldDef.key];
    const normalizeKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedObjKeys = Object.keys(obj).reduce((acc, k) => { acc[normalizeKey(k)] = k; return acc; }, {});
    for (const key of (fieldDef.aliases || [])) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        const normKey = normalizeKey(key);
        const realKey = normalizedObjKeys[normKey];
        if (realKey && obj[realKey] !== undefined && obj[realKey] !== null) return obj[realKey];
    }
    const searchTerms = [fieldDef.key, fieldDef.label].filter(Boolean).map(normalizeKey);
    for (const term of searchTerms) {
        if (term.length < 3) continue;
        const matchingKey = Object.keys(normalizedObjKeys).find(k => k.includes(term));
        if (matchingKey) {
            const realKey = normalizedObjKeys[matchingKey];
            if (obj[realKey] !== undefined && obj[realKey] !== null) return obj[realKey];
        }
    }
    return undefined;
};

/**
 * Parsea fechas de varios formatos a ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
 */
export const parseImportDate = (val) => {
    if (!val) return null;
    if (typeof val !== 'string') return val;
    // Ya es ISO
    if (/^\d{4}-/.test(val)) return val;

    // DD/MM/YYYY o DD/MM/YYYY HH:mm
    if (val.includes('/')) {
        const [datePart, timePart] = val.split(' ');
        const parts = datePart.split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                const dateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                return timePart ? `${dateStr}T${timePart}:00` : dateStr;
            }
        }
    }
    return val;
};

/**
 * Realiza una normalización completa de una fila de orden.
 * @param {Object} row Fila de datos bruta
 * @returns {Object} Fila normalizada
 */
export const normalizeOrder = (row) => {
    const originalMachineId = row.machine_id;
    const newRow = { ...row };

    SYSTEM_FIELDS.forEach(field => {
        const val = extractValue(row, field);
        if (val !== undefined) newRow[field.key] = val;
    });

    // Restaurar machine_id si era un hex de BD válido (24 chars)
    if (originalMachineId && /^[a-f0-9]{24}$/i.test(String(originalMachineId).trim())) {
        newRow.machine_id = originalMachineId;
    }

    newRow.priority = parseInt(newRow.priority) || 0;
    newRow.quantity = parseInt(newRow.quantity) || 0;
    newRow.status = newRow.status || 'Pendiente';
    newRow.multi_unit = parseInt(newRow.multi_unit) || 0;
    newRow.multi_qty = parseFloat(newRow.multi_qty) || 0;
    newRow.production_cadence = parseFloat(newRow.production_cadence) || 0;

    // Normalizar todas las fechas críticas
    newRow.start_date = parseImportDate(newRow.start_date);
    newRow.modified_start_date = parseImportDate(newRow.modified_start_date);
    newRow.planned_end_date = parseImportDate(newRow.planned_end_date);
    newRow.committed_delivery_date = parseImportDate(newRow.committed_delivery_date);
    newRow.new_delivery_date = parseImportDate(newRow.new_delivery_date);

    // Derivación de fechas vigentes para el Gantt
    // El inicio vigente es la fecha modificada si existe, si no la de inicio límite
    newRow.effective_start_date = (newRow.modified_start_date && !String(newRow.modified_start_date).startsWith('0000'))
        ? newRow.modified_start_date
        : newRow.start_date;

    // CRITICAL FIX PARA GANTT: La fecha de fin en el Gantt debe ser planned_end_date (Fecha Fin)
    // El Gantt en ProductionPlanning.jsx usa effective_delivery_date para renderizar el bloque.
    newRow.effective_delivery_date = (newRow.planned_end_date && !String(newRow.planned_end_date).startsWith('0000'))
        ? newRow.planned_end_date
        : ((newRow.new_delivery_date && !String(newRow.new_delivery_date).startsWith('0000'))
            ? newRow.new_delivery_date
            : newRow.committed_delivery_date);

    return newRow;
};
