import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Función para extraer datos de sistema de fichaje externo
 * 
 * Esta función debe adaptarse al proveedor específico de fichaje.
 * Ejemplo genérico de estructura.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, shift } = await req.json();
    
    // CONFIGURACIÓN DEL PROVEEDOR DE FICHAJE
    // Ajustar según API del proveedor (ejemplos: ZKTeco, Anviz, etc)
    const FICHAJE_API_URL = Deno.env.get("FICHAJE_API_URL");
    const FICHAJE_API_KEY = Deno.env.get("FICHAJE_API_KEY");
    
    if (!FICHAJE_API_URL || !FICHAJE_API_KEY) {
      return Response.json({ 
        error: 'Configuración incompleta. Define FICHAJE_API_URL y FICHAJE_API_KEY' 
      }, { status: 500 });
    }

    // Extraer datos del sistema de fichaje externo
    const attendanceResponse = await fetch(`${FICHAJE_API_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FICHAJE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: date,
        shift: shift
      })
    });

    if (!attendanceResponse.ok) {
      throw new Error(`Error al conectar con sistema de fichaje: ${attendanceResponse.statusText}`);
    }

    const attendanceData = await attendanceResponse.json();

    // Obtener empleados del sistema
    const employees = await base44.asServiceRole.entities.Employee.filter({
      estado_empleado: "Alta",
      incluir_en_planning: true
    });

    // Comparar fichajes con empleados registrados
    const analysis = {
      date: date,
      shift: shift,
      present: [],
      absent: [],
      late: [],
      absenceConflicts: []
    };

    for (const employee of employees) {
      // Buscar fichaje del empleado
      const attendance = attendanceData.records?.find(
        record => record.employee_name === employee.nombre || record.employee_code === employee.codigo_empleado
      );

      const expectedTime = shift === 'Mañana' 
        ? employee.horario_manana_inicio || '07:00'
        : employee.horario_tarde_inicio || '14:00';

      if (attendance) {
        // Empleado presente
        const entryTime = attendance.entry_time;
        const isLate = entryTime > expectedTime;

        analysis.present.push({
          employee_id: employee.id,
          employee_name: employee.nombre,
          entry_time: entryTime,
          expected_time: expectedTime,
          is_late: isLate,
          delay_minutes: isLate ? calculateDelay(expectedTime, entryTime) : 0
        });

        // Verificar si tenía ausencia programada
        if (employee.disponibilidad === "Ausente") {
          analysis.absenceConflicts.push({
            employee_id: employee.id,
            employee_name: employee.nombre,
            scheduled_absence: {
              start: employee.ausencia_inicio,
              end: employee.ausencia_fin,
              reason: employee.ausencia_motivo
            },
            actual_entry: entryTime
          });
        }

        if (isLate) {
          analysis.late.push({
            employee_id: employee.id,
            employee_name: employee.nombre,
            expected: expectedTime,
            actual: entryTime,
            delay_minutes: calculateDelay(expectedTime, entryTime)
          });
        }
      } else {
        // Empleado ausente
        analysis.absent.push({
          employee_id: employee.id,
          employee_name: employee.nombre,
          expected_time: expectedTime,
          has_scheduled_absence: employee.disponibilidad === "Ausente"
        });
      }
    }

    // Guardar registros de asistencia
    const timestamp = new Date().toISOString();
    for (const present of analysis.present) {
      await base44.asServiceRole.entities.AttendanceRecord.create({
        employee_id: present.employee_id,
        fecha: date,
        turno: shift,
        hora_entrada: present.entry_time,
        hora_salida: null,
        estado: present.is_late ? "Retraso" : "Presente",
        minutos_retraso: present.delay_minutes,
        registrado_en: timestamp
      });
    }

    // Crear ausencias automáticas para empleados sin fichaje
    for (const absent of analysis.absent) {
      if (!absent.has_scheduled_absence) {
        const startDateTime = new Date(`${date}T${absent.expected_time}:00`);
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 8); // 8 horas de jornada

        await base44.asServiceRole.entities.Absence.create({
          employee_id: absent.employee_id,
          fecha_inicio: startDateTime.toISOString(),
          fecha_fin: endDateTime.toISOString(),
          motivo: "Ausencia detectada automáticamente - Sin fichaje",
          tipo: "Falta injustificada",
          remunerada: false,
          estado_aprobacion: "Pendiente",
          notas: `Ausencia registrada automáticamente por sistema de control de presencia en fecha ${date}`
        });

        await base44.asServiceRole.entities.AttendanceRecord.create({
          employee_id: absent.employee_id,
          fecha: date,
          turno: shift,
          estado: "Ausente",
          registrado_en: timestamp
        });
      }
    }

    return Response.json({
      success: true,
      date: date,
      shift: shift,
      summary: {
        total_employees: employees.length,
        present: analysis.present.length,
        absent: analysis.absent.length,
        late: analysis.late.length,
        conflicts: analysis.absenceConflicts.length
      },
      analysis: analysis
    });

  } catch (error) {
    console.error("Error en fetchAttendanceData:", error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});

function calculateDelay(expectedTime, actualTime) {
  const [expH, expM] = expectedTime.split(':').map(Number);
  const [actH, actM] = actualTime.split(':').map(Number);
  
  const expectedMinutes = expH * 60 + expM;
  const actualMinutes = actH * 60 + actM;
  
  return Math.max(0, actualMinutes - expectedMinutes);
}