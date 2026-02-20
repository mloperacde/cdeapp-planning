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

    const filter = {};
    if (record_date) filter.record_date = record_date;
    if (import_batch) filter.import_batch = import_batch;
    const pageSize = 2000;
    let totalDeleted = 0;
    let passes = 0;
    const maxPasses = 20;
    while (passes < maxPasses) {
      passes++;
      const page = await base44.asServiceRole.entities.AttendanceRecord.filter(filter, 'record_time', pageSize);
      const ids = (page || []).map(r => r.id);
      if (ids.length === 0) break;
      for (const id of ids) {
        try {
          await base44.asServiceRole.entities.AttendanceRecord.delete(id);
          totalDeleted++;
        } catch {}
      }
      if (ids.length < pageSize) break;
    }
    return Response.json({ deleted: totalDeleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
