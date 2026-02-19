import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { record_date, import_batch } = await req.json();

    if (!record_date && !import_batch) {
      return Response.json({ error: 'Se requiere record_date o import_batch' }, { status: 400 });
    }

    // Filtrar registros según parámetros
    let filter = {};
    if (record_date) filter.record_date = record_date;
    if (import_batch) filter.import_batch = import_batch;

    // Obtener todos los IDs a eliminar
    const records = await base44.asServiceRole.entities.AttendanceRecord.filter(filter, 'record_date', 2000);
    
    if (!records || records.length === 0) {
      return Response.json({ deleted: 0, message: 'No se encontraron registros' });
    }

    // Eliminar en lotes con pequeña pausa para evitar rate limit
    let deleted = 0;
    let errors = 0;
    const batchSize = 20;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await Promise.all(
        batch.map(r =>
          base44.asServiceRole.entities.AttendanceRecord.delete(r.id)
            .then(() => { deleted++; })
            .catch(() => { errors++; }) // ignorar 404 (ya borrado)
        )
      );
      // Pausa de 200ms entre lotes para evitar 429
      if (i + batchSize < records.length) {
        await new Promise(res => setTimeout(res, 200));
      }
    }

    return Response.json({ deleted, errors, total: records.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});