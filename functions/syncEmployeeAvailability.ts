import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Permitir llamadas sin autenticación (desde scheduled tasks)
    const isAuthenticated = await base44.auth.isAuthenticated();
    
    console.log('🔄 Iniciando sincronización de disponibilidad de empleados...');
    console.log('🔐 Authenticated:', isAuthenticated);
    
    // Obtener todas las ausencias y empleados
    const absences = await base44.asServiceRole.entities.Absence.list(undefined, 1000);
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 1000);
    
    const now = new Date();
    let updatedCount = 0;
    let errors = [];
    
    console.log(`📊 Procesando ${employees.length} empleados con ${absences.length} ausencias`);
    
    for (const employee of employees) {
      try {
        // Buscar ausencias activas para este empleado
        const employeeAbsences = absences.filter(abs => {
          if (abs.employee_id !== employee.id) return false;
          if (!abs.fecha_inicio) return false;
          
          const start = new Date(abs.fecha_inicio);
          const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
          
          return now >= start && now <= end;
        });
        
        const shouldBeAbsent = employeeAbsences.length > 0;
        const currentStatus = employee.disponibilidad || "Disponible";
        
        // Actualizar solo si hay cambio
        if (shouldBeAbsent && currentStatus !== "Ausente") {
          const activeAbsence = employeeAbsences[0]; // Usar la primera ausencia activa
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(employee.id, {
            disponibilidad: "Ausente",
            ausencia_inicio: activeAbsence.fecha_inicio,
            ausencia_fin: activeAbsence.fecha_fin,
            ausencia_motivo: activeAbsence.motivo
          });
          updatedCount++;
          console.log(`✅ ${employee.nombre}: Disponible → Ausente`);
        } else if (!shouldBeAbsent && currentStatus === "Ausente") {
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(employee.id, {
            disponibilidad: "Disponible",
            ausencia_inicio: null,
            ausencia_fin: null,
            ausencia_motivo: null
          });
          updatedCount++;
          console.log(`✅ ${employee.nombre}: Ausente → Disponible`);
        }
      } catch (error) {
        errors.push({ empleado: employee.nombre, error: error.message });
        console.error(`❌ Error procesando ${employee.nombre}:`, error.message);
      }
    }
    
    console.log(`✅ Sincronización completada: ${updatedCount} empleados actualizados`);
    
    return Response.json({
      status: 'success',
      fecha: new Date().toISOString(),
      empleados_procesados: employees.length,
      empleados_actualizados: updatedCount,
      errores: errors.length,
      detalles_errores: errors.slice(0, 5)
    });

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return Response.json({ 
      status: 'error', 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});