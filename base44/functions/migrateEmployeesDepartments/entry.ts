import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Obtener todos los empleados
        const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();

        const updates = [];
        const errors = [];

        // Migrar "Fabricación" -> "Producción"
        for (const emp of employees) {
            if (emp.departamento === "FABRICACION" || emp.departamento === "Fabricación" || 
                emp.departamento === "fabricacion" || emp.departamento === "FABRICACIÓN") {
                try {
                    await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
                        departamento: "PRODUCCIÓN"
                    });
                    updates.push({
                        empleado: emp.nombre,
                        codigo: emp.codigo_empleado,
                        cambio: "FABRICACION -> PRODUCCIÓN"
                    });
                } catch (error) {
                    errors.push({
                        empleado: emp.nombre,
                        error: error.message
                    });
                }
            }
        }

        return Response.json({
            success: true,
            message: `Migración completada: ${updates.length} empleados actualizados`,
            updates_count: updates.length,
            errors_count: errors.length,
            updates,
            errors
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});