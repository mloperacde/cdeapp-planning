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

    // Obtener registros de 1 en 1 con pausa larga para evitar rate limit
    const filter = {};
    if (record_date) filter.record_date = record_date;
    if (import_batch) filter.import_batch = import_batch;

    let allIds = [];
    let skip = 0;
    const pageSize = 50;

    while (true) {
      await new Promise(res => setTimeout(res, 300));
      let page;
      try {
        page = await base44.asServiceRole.entities.AttendanceRecord.filter(filter, 'record_date', pageSize);
      } catch {
        break;
      }
      if (!page || page.length === 0) break;
      allIds = allIds.concat(page.map(r => r.id));
      if (page.length < pageSize) break;
      skip += pageSize;
      // Evitar bucle infinito
      if (allIds.length >= 2000) break;
    }

    if (allIds.length === 0) {
      return Response.json({ deleted: 0, message: 'No se encontraron registros' });
    }

    // Eliminar de 1 en 1 con pausa para respetar rate limit
    let deleted = 0;
    for (const id of allIds) {
      await new Promise(res => setTimeout(res, 100));
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