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
    const pageSize = 500; 
    let totalDeleted = 0;
    
    // Use a loop to ensure ALL records are deleted, not just the first page.
    // We'll limit the max loops to prevent infinite loops in case of errors.
    const maxLoops = 20; // Up to 10,000 records should be enough
    
    for (let loop = 0; loop < maxLoops; loop++) {
        const page = await base44.asServiceRole.entities.AttendanceRecord.filter(filter, 'record_time', pageSize);
        const ids = (page || []).map(r => r.id);
        
        if (ids.length === 0) break; // Done
        
        // Parallel deletion in chunks of 50 for speed
        const chunkSize = 50;
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            await Promise.all(chunk.map(id => 
                base44.asServiceRole.entities.AttendanceRecord.delete(id).catch(() => {})
            ));
            totalDeleted += chunk.length;
        }
        
        // If we fetched fewer than pageSize, we are done
        if (ids.length < pageSize) break;
    }
    
    return Response.json({ deleted: totalDeleted, success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
