import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FASE 3B - FUNCIÓN CONSOLIDADA DE SINCRONIZACIÓN
 * 
 * Unifica toda la lógica de sincronización de empleados:
 * - Sincroniza disponibilidad basada en ausencias activas
 * - Completa datos faltantes con valores inteligentes
 * - Normaliza formatos de fecha
 * - Mantiene coherencia entre Employee (deprecated) y EmployeeMasterDatabase
 */

async function processInChunks(items, chunkSize, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processFn));
    results.push(...chunkResults);
  }
  return results;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Permitir llamadas autenticadas o service role
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (e) {
            // Continuar sin usuario - puede ser llamada de servicio
        }

        console.log("🔄 Iniciando sincronización consolidada de empleados...");

        // 1. Cargar todos los datos necesarios
        const [employeesMaster, absences, teams, lockerConfigs, machines] = await Promise.all([
            base44.asServiceRole.entities.EmployeeMasterDatabase.list('nombre', 2000),
            base44.asServiceRole.entities.Absence.list('-fecha_inicio', 3000),
            base44.asServiceRole.entities.TeamConfig.list(),
            base44.asServiceRole.entities.LockerRoomConfig.list(),
            base44.asServiceRole.entities.Machine.list()
        ]);

        console.log(`📊 Datos cargados: ${employeesMaster.length} empleados, ${absences.length} ausencias`);

        const stats = {
            total_procesados: 0,
            disponibilidad_actualizada: 0,
            datos_completados: 0,
            fechas_normalizadas: 0,
            equipos_asignados: 0,
            taquillas_asignadas: 0,
            errores: []
        };

        const now = new Date();
        const departmentsByCategory = {
          '1': { departamento: 'FABRICACION', puesto: 'Operario/a de Producción' },
          '2': { departamento: 'FABRICACION', puesto: 'Segunda de Línea' },
          '3': { departamento: 'FABRICACION', puesto: 'Responsable de Línea' },
        };

        // 2. Procesar empleados en chunks
        await processInChunks(employeesMaster, 20, async (emp) => {
            try {
                const updates = {};
                let needsUpdate = false;

                // A. SINCRONIZAR DISPONIBILIDAD
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
                    updates.disponibilidad = newStatus;
                    updates.ausencia_inicio = activeAbsence ? activeAbsence.fecha_inicio : null;
                    updates.ausencia_fin = activeAbsence ? activeAbsence.fecha_fin : null;
                    updates.ausencia_motivo = activeAbsence ? activeAbsence.motivo : null;
                    needsUpdate = true;
                    stats.disponibilidad_actualizada++;
                }

                // B. COMPLETAR DEPARTAMENTO Y PUESTO
                if (!emp.departamento || !emp.puesto) {
                    const categoryInfo = departmentsByCategory[emp.categoria] || departmentsByCategory['1'];
                    if (!emp.departamento) {
                        updates.departamento = categoryInfo.departamento;
                        needsUpdate = true;
                        stats.datos_completados++;
                    }
                    if (!emp.puesto) {
                        updates.puesto = categoryInfo.puesto;
                        needsUpdate = true;
                        stats.datos_completados++;
                    }
                }

                // C. ASIGNAR EQUIPO (solo para rotativos sin equipo)
                if (!emp.equipo && emp.tipo_turno === 'Rotativo' && teams.length > 0) {
                    const teamIndex = stats.equipos_asignados % teams.length;
                    updates.equipo = teams[teamIndex].team_name;
                    needsUpdate = true;
                    stats.equipos_asignados++;
                }

                // D. ASIGNAR VESTUARIO Y TAQUILLA
                if (!emp.taquilla_vestuario || !emp.taquilla_numero) {
                    const isFemale = emp.sexo === 'Femenino';
                    let vestuario;
                    
                    if (isFemale) {
                        vestuario = Math.random() > 0.7 
                            ? 'Vestuario Femenino Planta Baja'
                            : 'Vestuario Femenino Planta Alta';
                    } else {
                        vestuario = 'Vestuario Masculino Planta Baja';
                    }
                    
                    if (!emp.taquilla_vestuario) {
                        updates.taquilla_vestuario = vestuario;
                        needsUpdate = true;
                    }

                    if (!emp.taquilla_numero) {
                        const lockerConfig = lockerConfigs.find(lc => lc.vestuario === vestuario);
                        if (lockerConfig && lockerConfig.identificadores_taquillas?.length > 0) {
                            const assignedLockers = employeesMaster
                                .filter(e => e.taquilla_vestuario === vestuario && e.taquilla_numero)
                                .map(e => e.taquilla_numero);
                            
                            const availableLocker = lockerConfig.identificadores_taquillas
                                .find(num => !assignedLockers.includes(num));
                            
                            if (availableLocker) {
                                updates.taquilla_numero = availableLocker;
                                needsUpdate = true;
                                stats.taquillas_asignadas++;
                            }
                        }
                    }
                }

                // E. NORMALIZAR FECHAS (dd/mm/yyyy → yyyy-mm-dd)
                const dateFields = ['fecha_nacimiento', 'fecha_alta', 'fecha_fin_contrato', 'fecha_baja'];
                for (const field of dateFields) {
                    if (emp[field] && typeof emp[field] === 'string' && emp[field].includes('/')) {
                        const parts = emp[field].split('/');
                        if (parts.length === 3) {
                            const [day, month, year] = parts;
                            updates[field] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            needsUpdate = true;
                            stats.fechas_normalizadas++;
                        }
                    }
                }

                // F. COMPLETAR HORARIOS ESTÁNDAR
                if (!emp.horario_manana_inicio && emp.tipo_jornada === 'Jornada Completa') {
                    updates.horario_manana_inicio = '07:00';
                    updates.horario_manana_fin = '15:00';
                    updates.horario_tarde_inicio = '14:00';
                    updates.horario_tarde_fin = '22:00';
                    needsUpdate = true;
                    stats.datos_completados++;
                }

                // Actualizar si hay cambios
                if (needsUpdate && Object.keys(updates).length > 0) {
                    await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, updates);
                    stats.total_procesados++;
                }

            } catch (error) {
                stats.errores.push({
                    empleado: emp.nombre || emp.codigo_empleado || 'Desconocido',
                    error: error.message
                });
                console.error(`❌ Error procesando ${emp.nombre}:`, error);
            }
        });

        console.log("✅ Sincronización completada");

        return Response.json({ 
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});