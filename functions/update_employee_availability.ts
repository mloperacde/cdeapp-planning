import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { isWithinInterval, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all employees and active/future absences
        const [employees, absences] = await Promise.all([
            base44.entities.EmployeeMasterDatabase.list('nombre', 1000), // Check master db
            base44.entities.Absence.list('-fecha_inicio', 2000)
        ]);
        
        // Also fetch Employee entity (synced copy)
        const employeesSynced = await base44.entities.Employee.list('nombre', 1000);

        const now = new Date();
        const updatesMaster = [];
        const updatesSynced = [];

        // 2. Determine status for each employee
        for (const emp of employees) {
            // Find active absences for this employee
            const activeAbsence = absences.find(a => {
                if (a.employee_id !== emp.id) return false;
                
                const start = new Date(a.fecha_inicio);
                const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(a.fecha_fin);
                
                return now >= start && now <= end;
            });

            const currentStatus = emp.disponibilidad;
            const newStatus = activeAbsence ? "Ausente" : "Disponible";
            
            // Prepare update if changed
            if (currentStatus !== newStatus) {
                updatesMaster.push(base44.entities.EmployeeMasterDatabase.update(emp.id, {
                    disponibilidad: newStatus,
                    ausencia_inicio: activeAbsence ? activeAbsence.fecha_inicio : null,
                    ausencia_fin: activeAbsence ? activeAbsence.fecha_fin : null,
                    ausencia_motivo: activeAbsence ? activeAbsence.motivo : null
                }));
            }
        }
        
        // Same for Synced Employees
        for (const emp of employeesSynced) {
             const activeAbsence = absences.find(a => {
                if (a.employee_id !== emp.id) return false;
                
                const start = new Date(a.fecha_inicio);
                const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(a.fecha_fin);
                
                return now >= start && now <= end;
            });

            const currentStatus = emp.disponibilidad;
            const newStatus = activeAbsence ? "Ausente" : "Disponible";
            
            if (currentStatus !== newStatus) {
                updatesSynced.push(base44.entities.Employee.update(emp.id, {
                     disponibilidad: newStatus,
                     ausencia_inicio: activeAbsence ? activeAbsence.fecha_inicio : null,
                     ausencia_fin: activeAbsence ? activeAbsence.fecha_fin : null,
                     ausencia_motivo: activeAbsence ? activeAbsence.motivo : null
                }));
            }
        }

        // 3. Execute updates
        await Promise.all([...updatesMaster, ...updatesSynced]);

        return Response.json({ 
            success: true, 
            updated_master: updatesMaster.length, 
            updated_synced: updatesSynced.length 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});