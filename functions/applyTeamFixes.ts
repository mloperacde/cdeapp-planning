import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { fixes } = await req.json();

        if (!fixes || !Array.isArray(fixes)) {
            return Response.json({ 
                error: 'Invalid payload. Expected { fixes: [...] }' 
            }, { status: 400 });
        }

        const results = [];

        for (const fix of fixes) {
            try {
                await base44.asServiceRole.entities.EmployeeMasterDatabase.update(
                    fix.employee_id, 
                    fix.updates
                );
                results.push({
                    employee_id: fix.employee_id,
                    employee_name: fix.employee_name,
                    status: 'success',
                    applied_updates: fix.updates
                });
            } catch (error) {
                results.push({
                    employee_id: fix.employee_id,
                    employee_name: fix.employee_name,
                    status: 'error',
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        return Response.json({
            success: true,
            message: `${successCount} correcciones aplicadas, ${errorCount} errores`,
            summary: {
                total_fixes: fixes.length,
                successful: successCount,
                failed: errorCount
            },
            results: results
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});