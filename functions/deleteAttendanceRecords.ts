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
    
    // Optimize: Fetch IDs only, and delete in parallel chunks
    const pageSize = 500; // Smaller chunks for better control
    let totalDeleted = 0;
    
    // We only try one pass of fetching to avoid timeout. 
    // If there are more than 500 records, user might need to run again or we implement a better bulk delete if API supports it.
    // The previous loop was too slow (sequential delete).
    
    const page = await base44.asServiceRole.entities.AttendanceRecord.filter(filter, 'record_time', pageSize);
    const ids = (page || []).map(r => r.id);
    
    if (ids.length > 0) {
        // Parallel deletion in chunks of 20
        const chunkSize = 20;
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            await Promise.all(chunk.map(id => 
                base44.asServiceRole.entities.AttendanceRecord.delete(id).catch(() => {})
            ));
            totalDeleted += chunk.length;
        }
    }
    
    return Response.json({ deleted: totalDeleted, partial: ids.length === pageSize });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
