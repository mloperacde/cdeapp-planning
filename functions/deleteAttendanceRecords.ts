import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { record_date, import_batch } = body;

    if (!record_date && !import_batch) {
      return Response.json({ error: 'Se requiere record_date o import_batch' }, { status: 400 });
    }

    // Obtener todos los registros que coinciden con el filtro (fecha o batch)
    const filter = {};
    if (record_date) filter.record_date = record_date;
    if (import_batch) filter.import_batch = import_batch;

    const pageSize = 2000;
    const page = await base44.asServiceRole.entities.AttendanceRecord.filter(filter, 'record_date', pageSize);
    const allIds = (page || []).map(r => r.id);

    if (allIds.length === 0) {
      return Response.json({ deleted: 0, message: 'No se encontraron registros' });
    }

    // Eliminar de uno en uno (secuencial) para evitar timeouts por exceso de concurrencia
    let deleted = 0;
    for (const id of allIds) {
      try {
        await base44.asServiceRole.entities.AttendanceRecord.delete(id);
        deleted++;
      } catch {
        // ignorar errores individuales (404, etc.)
      }
    }

    return Response.json({ deleted, total: allIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
