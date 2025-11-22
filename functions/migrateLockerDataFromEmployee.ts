import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Obtener todos los empleados maestros
        const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();
        
        // Obtener configuraciones de vestuario existentes
        const existingConfigs = await base44.asServiceRole.entities.LockerRoomConfig.list();
        
        let migratedCount = 0;
        let configsCreated = 0;
        const errors = [];

        // Mapeo de vestuarios existentes
        const vestuarioMap = new Map();
        existingConfigs.forEach(config => {
            vestuarioMap.set(config.vestuario, config);
        });

        for (const emp of masterEmployees) {
            try {
                // Solo migrar si tiene datos de taquilla
                if (!emp.taquilla_vestuario || !emp.taquilla_numero) {
                    continue;
                }

                const vestuario = emp.taquilla_vestuario;
                const numeroTaquilla = emp.taquilla_numero;

                // Verificar/crear configuración de vestuario si no existe
                if (!vestuarioMap.has(vestuario)) {
                    // Determinar número de taquillas según el vestuario
                    let numeroTaquillas = 0;
                    if (vestuario.includes('Femenino Planta Baja')) {
                        numeroTaquillas = 56;
                    } else if (vestuario.includes('Femenino Planta Alta')) {
                        numeroTaquillas = 163;
                    } else if (vestuario.includes('Masculino')) {
                        numeroTaquillas = 28;
                    } else {
                        numeroTaquillas = 100; // valor por defecto
                    }

                    const newConfig = await base44.asServiceRole.entities.LockerRoomConfig.create({
                        vestuario: vestuario,
                        numero_taquillas_instaladas: numeroTaquillas,
                        identificadores_taquillas: [],
                        notas: `Creado automáticamente durante migración de datos`
                    });

                    vestuarioMap.set(vestuario, newConfig);
                    configsCreated++;
                }

                // Verificar si ya existe una asignación
                const existingAssignments = await base44.asServiceRole.entities.LockerAssignment.filter({
                    employee_id: emp.employee_id
                });

                if (existingAssignments.length === 0 && emp.employee_id) {
                    // Crear nueva asignación
                    await base44.asServiceRole.entities.LockerAssignment.create({
                        employee_id: emp.employee_id,
                        requiere_taquilla: true,
                        vestuario: vestuario,
                        numero_taquilla_actual: numeroTaquilla,
                        numero_taquilla_nuevo: "",
                        fecha_asignacion: new Date().toISOString(),
                        notificacion_enviada: false,
                        historial_cambios: []
                    });

                    migratedCount++;
                } else if (existingAssignments.length > 0) {
                    // Actualizar asignación existente si está vacía
                    const existing = existingAssignments[0];
                    if (!existing.vestuario || !existing.numero_taquilla_actual) {
                        await base44.asServiceRole.entities.LockerAssignment.update(existing.id, {
                            vestuario: vestuario,
                            numero_taquilla_actual: numeroTaquilla,
                            fecha_asignacion: new Date().toISOString()
                        });
                        migratedCount++;
                    }
                }

                // Pequeño delay para evitar sobrecarga
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                errors.push({
                    empleado: emp.nombre,
                    error: error.message
                });
            }
        }

        return Response.json({
            success: true,
            message: `Migración completada`,
            migrated: migratedCount,
            configsCreated: configsCreated,
            errors: errors.length,
            errorDetails: errors.slice(0, 10) // Solo primeros 10 errores
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});