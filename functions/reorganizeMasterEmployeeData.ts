import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Reorganiza y limpia los datos de EmployeeMasterDatabase
 * Corrige campos que fueron importados en columnas incorrectas
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todos los empleados del maestro
    const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();
    
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const emp of masterEmployees) {
      try {
        const correctedData = { ...emp };
        let needsUpdate = false;

        // Detectar y corregir patrones de datos mal posicionados
        
        // Patrón 1: tipo_contrato con "true" y datos desplazados
        if (correctedData.tipo_contrato === "true" || correctedData.tipo_contrato === true) {
          needsUpdate = true;
          
          // Los datos están desplazados:
          // tipo_contrato tiene "true" -> debería ser incluir_en_planning
          // codigo_contrato tiene fecha -> debería ser fecha_alta
          // fecha_fin_contrato tiene tipo -> debería ser tipo_contrato
          // empresa_ett tiene código -> debería ser codigo_contrato
          
          if (correctedData.codigo_contrato && /^\d{2}\/\d{2}\/\d{4}$/.test(correctedData.codigo_contrato)) {
            correctedData.fecha_alta = correctedData.codigo_contrato;
            correctedData.codigo_contrato = null;
          }
          
          if (correctedData.fecha_fin_contrato && ['INDEFINIDO', 'TEMPORAL', 'ETT'].includes(correctedData.fecha_fin_contrato)) {
            correctedData.tipo_contrato = correctedData.fecha_fin_contrato;
            correctedData.fecha_fin_contrato = null;
          }
          
          if (correctedData.empresa_ett && /^\d+$/.test(correctedData.empresa_ett)) {
            const num = parseInt(correctedData.empresa_ett);
            if (num < 1000) {
              correctedData.codigo_contrato = correctedData.empresa_ett;
            } else {
              correctedData.salario_anual = num;
            }
            correctedData.empresa_ett = null;
          }
          
          correctedData.incluir_en_planning = true;
        }
        
        // Patrón 1b: Otro patrón común con datos desplazados (sin "true")
        if (!correctedData.fecha_alta && correctedData.codigo_contrato && /^\d{2}\/\d{2}\/\d{4}$/.test(correctedData.codigo_contrato)) {
          needsUpdate = true;
          correctedData.fecha_alta = correctedData.codigo_contrato;
          correctedData.codigo_contrato = null;
        }
        
        if (!correctedData.tipo_contrato && correctedData.fecha_fin_contrato && ['INDEFINIDO', 'TEMPORAL', 'ETT'].includes(correctedData.fecha_fin_contrato)) {
          needsUpdate = true;
          correctedData.tipo_contrato = correctedData.fecha_fin_contrato;
          correctedData.fecha_fin_contrato = null;
        }

        // Patrón 2: Corregir ausencia_fin con "Disponible"
        if (correctedData.ausencia_fin === "Disponible") {
          needsUpdate = true;
          correctedData.ausencia_fin = null;
        }

        // Patrón 3: Corregir ausencia_motivo con "Disponible"
        if (correctedData.ausencia_motivo === "Disponible") {
          needsUpdate = true;
          correctedData.ausencia_motivo = null;
        }

        // Patrón 4: Limpiar IDs en campos de texto
        const idPattern = /^[a-f0-9]{24}$/;
        const textFields = ['disponibilidad', 'ausencia_inicio', 'ausencia_fin', 'ausencia_motivo'];
        textFields.forEach(field => {
          if (correctedData[field] && idPattern.test(correctedData[field])) {
            needsUpdate = true;
            correctedData[field] = null;
          }
        });

        // Patrón 5: Normalizar fechas de DD/MM/YYYY a YYYY-MM-DD
        const dateFields = [
          'fecha_nacimiento', 'fecha_baja', 'fecha_alta', 
          'fecha_fin_contrato', 'ultima_actualizacion_absentismo', 
          'ultimo_reset_causa_mayor'
        ];
        
        dateFields.forEach(field => {
          if (correctedData[field] && /^\d{2}\/\d{2}\/\d{4}$/.test(correctedData[field])) {
            needsUpdate = true;
            const [day, month, year] = correctedData[field].split('/');
            correctedData[field] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        });

        // Patrón 6: Normalizar horarios de H:MM a HH:MM
        const timeFields = [
          'horario_manana_inicio', 'horario_manana_fin',
          'horario_tarde_inicio', 'horario_tarde_fin',
          'turno_partido_entrada1', 'turno_partido_salida1',
          'turno_partido_entrada2', 'turno_partido_salida2'
        ];
        
        timeFields.forEach(field => {
          if (correctedData[field] && /^\d{1,2}:\d{2}$/.test(correctedData[field])) {
            needsUpdate = true;
            const [hour, minute] = correctedData[field].split(':');
            correctedData[field] = `${hour.padStart(2, '0')}:${minute}`;
          }
        });

        // Actualizar solo si hay cambios
        if (needsUpdate) {
          // Eliminar campos del sistema antes de actualizar
          delete correctedData.id;
          delete correctedData.created_date;
          delete correctedData.updated_date;
          delete correctedData.created_by;
          delete correctedData.employee_id;
          delete correctedData.ultimo_sincronizado;
          
          // Marcar como pendiente de sincronización
          correctedData.estado_sincronizacion = 'Pendiente';
          
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, correctedData);
          processedCount++;
        }

      } catch (error) {
        errorCount++;
        errors.push({
          empleado: emp.nombre,
          error: error.message
        });
      }

      // Delay para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return Response.json({
      success: true,
      total: masterEmployees.length,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors,
      message: `Reorganización completada: ${processedCount} empleados corregidos, ${errorCount} errores`
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});