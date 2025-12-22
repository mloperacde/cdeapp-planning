import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FASE 2A - Migración de datos Employee → EmployeeMasterDatabase
 * 
 * Este script migra todos los registros de Employee a EmployeeMasterDatabase
 * manteniendo la integridad de datos y creando un log de migración.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Solo administradores pueden ejecutar la migración' }, { status: 403 });
        }

        const report = {
            inicio: new Date().toISOString(),
            empleados_legacy: 0,
            empleados_master: 0,
            migrados: 0,
            actualizados: 0,
            errores: [],
            warnings: []
        };

        // 1. Leer datos de Employee (legacy)
        const legacyEmployees = await base44.asServiceRole.entities.Employee.list();
        report.empleados_legacy = legacyEmployees.length;

        // 2. Leer datos de EmployeeMasterDatabase (actual)
        const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();
        report.empleados_master = masterEmployees.length;

        // 3. Crear índice de master por email y código
        const masterByEmail = new Map(masterEmployees.filter(e => e.email).map(e => [e.email.toLowerCase(), e]));
        const masterByCodigo = new Map(masterEmployees.filter(e => e.codigo_empleado).map(e => [e.codigo_empleado, e]));

        // 4. Procesar cada empleado legacy
        for (const legacyEmp of legacyEmployees) {
            try {
                // Buscar empleado en master por email o código
                const emailKey = legacyEmp.email?.toLowerCase();
                let masterEmp = emailKey ? masterByEmail.get(emailKey) : null;
                
                if (!masterEmp && legacyEmp.codigo_empleado) {
                    masterEmp = masterByCodigo.get(legacyEmp.codigo_empleado);
                }

                if (masterEmp) {
                    // EXISTE en master → actualizar solo si hay datos adicionales en legacy
                    const hasNewData = Object.keys(legacyEmp).some(key => {
                        if (['id', 'created_date', 'updated_date', 'created_by'].includes(key)) return false;
                        return legacyEmp[key] && !masterEmp[key];
                    });

                    if (hasNewData) {
                        // Merge: master data prevalece, pero se agregan campos nuevos de legacy
                        const merged = { ...legacyEmp, ...masterEmp };
                        await base44.asServiceRole.entities.EmployeeMasterDatabase.update(masterEmp.id, merged);
                        report.actualizados++;
                    }
                } else {
                    // NO EXISTE en master → crear nuevo registro
                    const newMaster = { ...legacyEmp };
                    delete newMaster.id; // Nuevo ID se generará
                    
                    await base44.asServiceRole.entities.EmployeeMasterDatabase.create(newMaster);
                    report.migrados++;
                }
            } catch (error) {
                report.errores.push({
                    empleado: legacyEmp.nombre || legacyEmp.codigo_empleado || 'Desconocido',
                    error: error.message
                });
            }
        }

        // 5. Warnings: detectar empleados solo en Master (no en legacy)
        const onlyInMaster = masterEmployees.filter(master => {
            const emailKey = master.email?.toLowerCase();
            const inLegacyByEmail = emailKey && legacyEmployees.some(l => l.email?.toLowerCase() === emailKey);
            const inLegacyByCodigo = master.codigo_empleado && legacyEmployees.some(l => l.codigo_empleado === master.codigo_empleado);
            return !inLegacyByEmail && !inLegacyByCodigo;
        });

        if (onlyInMaster.length > 0) {
            report.warnings.push(`${onlyInMaster.length} empleados existen solo en EmployeeMasterDatabase (probablemente ya migrados o nuevos)`);
        }

        report.fin = new Date().toISOString();
        report.exito = report.errores.length === 0;

        return Response.json({
            success: true,
            report
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});