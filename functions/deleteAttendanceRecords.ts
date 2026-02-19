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

    // Construir filtro
    const filter = {};
    if (record_date) filter.record_date = record_date;
    if (import_batch) filter.import_batch = import_batch;

    // Obtener registros (máx 500 por llamada)
    const records = await base44.asServiceRole.entities.AttendanceRecord.filter(filter, 'record_date', 500);

    if (!records || records.length === 0) {
      return Response.json({ deleted: 0, message: 'No se encontraron registros' });
    }

    // Eliminar de 10 en 10 con pequeña pausa
    let deleted = 0;
    const batchSize = 10;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(r => base44.asServiceRole.entities.AttendanceRecord.delete(r.id))
      );
      deleted += results.filter(r => r.status === 'fulfilled').length;
      if (i + batchSize < records.length) {
        await new Promise(res => setTimeout(res, 150));
      }
    }

    return Response.json({ deleted, total: records.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});