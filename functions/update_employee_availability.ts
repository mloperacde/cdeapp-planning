import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Allow both authenticated and service role calls
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (e) {
            // Continue without user - can be service role call
        }

        // 1. Fetch all employees and absences
        const [employeesMaster, employeesSynced, absences] = await Promise.all([
            base44.asServiceRole.entities.EmployeeMasterDatabase.list('nombre', 2000),
            base44.asServiceRole.entities.Employee.list('nombre', 2000),
            base44.asServiceRole.entities.Absence.list('-fecha_inicio', 3000)
        ]);

        const now = new Date();
        let updatedMaster = 0;
        let updatedSynced = 0;

        // 2. Process Master Database employees
        for (const emp of employeesMaster) {
            // Find ACTIVE absence for this employee (must be within current date/time)
            const activeAbsence = absences.find(a => {
                if (a.employee_id !== emp.id) return false;
                if (a.estado_aprobacion === 'Rechazada' || a.estado_aprobacion === 'Cancelada') return false;
                
                const start = new Date(a.fecha_inicio);
                const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(a.fecha_fin);
                
                return now >= start && now <= end;
            });

            const currentStatus = emp.disponibilidad || "Disponible";
            const newStatus = activeAbsence ? "Ausente" : "Disponible";
            
            // Update if changed
            if (currentStatus !== newStatus) {
                await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
                    disponibilidad: newStatus,
                    ausencia_inicio: activeAbsence ? activeAbsence.fecha_inicio : null,
                    ausencia_fin: activeAbsence ? activeAbsence.fecha_fin : null,
                    ausencia_motivo: activeAbsence ? activeAbsence.motivo : null
                });
                updatedMaster++;
            }
        }
        
        // 3. Process Synced employees
        for (const emp of employeesSynced) {
            const activeAbsence = absences.find(a => {
                if (a.employee_id !== emp.id) return false;
                if (a.estado_aprobacion === 'Rechazada' || a.estado_aprobacion === 'Cancelada') return false;
                
                const start = new Date(a.fecha_inicio);
                const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(a.fecha_fin);
                
                return now >= start && now <= end;
            });

            const currentStatus = emp.disponibilidad || "Disponible";
            const newStatus = activeAbsence ? "Ausente" : "Disponible";
            
            if (currentStatus !== newStatus) {
                await base44.asServiceRole.entities.Employee.update(emp.id, {
                    disponibilidad: newStatus,
                    ausencia_inicio: activeAbsence ? activeAbsence.fecha_inicio : null,
                    ausencia_fin: activeAbsence ? activeAbsence.fecha_fin : null,
                    ausencia_motivo: activeAbsence ? activeAbsence.motivo : null
                });
                updatedSynced++;
            }
        }

        return Response.json({ 
            success: true, 
            updated_master: updatedMaster, 
            updated_synced: updatedSynced,
            total_absences_checked: absences.length,
            total_employees_master: employeesMaster.length,
            total_employees_synced: employeesSynced.length
        });

    } catch (error) {
        console.error('Sync error:', error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});