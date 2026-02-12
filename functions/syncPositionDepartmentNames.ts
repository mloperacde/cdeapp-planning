import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all positions and departments
        const positions = await base44.asServiceRole.entities.Position.list();
        const departments = await base44.asServiceRole.entities.Department.list();

        const updates = [];
        
        for (const position of positions) {
            if (position.department_id) {
                const department = departments.find(d => d.id === position.department_id);
                
                if (department && position.department_name !== department.name) {
                    updates.push({
                        id: position.id,
                        name: position.name,
                        oldDeptName: position.department_name,
                        newDeptName: department.name
                    });
                }
            }
        }

        // Execute updates
        const results = [];
        for (const update of updates) {
            await base44.asServiceRole.entities.Position.update(update.id, {
                department_name: update.newDeptName?.toUpperCase()
            });
            results.push({
                position: update.name,
                oldDepartment: update.oldDeptName || 'null',
                newDepartment: update.newDeptName
            });
        }

        return Response.json({
            success: true,
            message: `${results.length} puestos actualizados`,
            positions_updated: results.length,
            details: results
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