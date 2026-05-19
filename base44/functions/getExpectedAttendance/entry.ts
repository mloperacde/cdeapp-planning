/**
 * getExpectedAttendance
 * Calcula para una fecha dada qué empleados deben estar presentes,
 * en qué turno y a qué hora, usando la ficha del empleado y el
 * calendario de rotación de equipos para los rotativos.
 *
 * Payload: { date?: "YYYY-MM-DD" }
 * Respuesta: { date, employees: [{ employee_id, nombre, departamento, turno, hora_entrada, hora_salida, tipo_turno, equipo }] }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Calcula el número de semana ISO para una fecha
function getISOWeekStart(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  // Obtener el lunes de esa semana (ISO week starts Monday)
  const day = d.getDay(); // 0=Sun, 1=Mon...6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // días hasta el lunes
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split("T")[0];

    // Semana ISO (lunes) de la fecha de análisis
    const weekStart = getISOWeekStart(targetDate);

    // Cargar empleados activos y sujetos a control horario
    const allEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({
      estado_empleado: "Alta",
      sujeto_a_control_horario: true
    });

    // Cargar el calendario de rotación de equipos
    const teamSchedules = await base44.asServiceRole.entities.TeamWeekSchedule.list("-fecha_inicio_semana", 1000);

    // Construir un mapa: "team_key|fecha_inicio_semana" => turno ("Mañana" | "Tarde")
    const rotationMap = {};
    for (const ts of teamSchedules) {
      const key = `${ts.team_key}|${ts.fecha_inicio_semana}`;
      rotationMap[key] = ts.turno; // "Mañana" o "Tarde"
    }

    const result = [];

    for (const emp of allEmployees) {
      // Solo empleados con control horario activo e incluidos en planning
      if (emp.incluir_en_planning === false) continue;

      const tipoTurno = emp.tipo_turno;
      let turno = null;        // "Mañana" | "Tarde" | "Partido"
      let hora_entrada = null;
      let hora_salida = null;

      if (tipoTurno === "Fijo Mañana") {
        turno = "Mañana";
        hora_entrada = emp.horario_manana_inicio || null;
        hora_salida = emp.horario_manana_fin || null;

      } else if (tipoTurno === "Fijo Tarde") {
        turno = "Tarde";
        hora_entrada = emp.horario_tarde_inicio || null;
        hora_salida = emp.horario_tarde_fin || null;

      } else if (tipoTurno === "Turno Partido") {
        turno = "Partido";
        hora_entrada = emp.turno_partido_entrada1 || emp.horario_manana_inicio || null;
        hora_salida = emp.turno_partido_salida2 || emp.horario_tarde_fin || null;

      } else if (tipoTurno === "Rotativo") {
        // Consultar el calendario de rotación
        // Normalizar team_key: puede venir como "team_1"/"team_2" o derivarse del campo equipo "Turno 1"/"Turno 2"
        let teamKey = emp.team_key;
        if (!teamKey && emp.equipo) {
          const equipoNorm = emp.equipo.toLowerCase().replace(/\s+/g, "");
          if (equipoNorm.includes("1") || equipoNorm.includes("turno1")) teamKey = "team_1";
          else if (equipoNorm.includes("2") || equipoNorm.includes("turno2")) teamKey = "team_2";
        }
        if (!teamKey) {
          // Sin equipo asignado: mañana por defecto con nota
          turno = "Mañana";
          hora_entrada = emp.horario_manana_inicio || null;
          hora_salida = emp.horario_manana_fin || null;
        } else {
          const rotKey = `${teamKey}|${weekStart}`;
          const turnoCalendario = rotationMap[rotKey];

          if (!turnoCalendario) {
            // No hay entrada en el calendario para esta semana - excluir o marcar como indeterminado
            result.push({
              employee_id: emp.codigo_empleado,
              employee_db_id: emp.id,
              nombre: emp.nombre,
              departamento: emp.departamento || "Sin Departamento",
              tipo_turno: tipoTurno,
              turno: null,
              hora_entrada: null,
              hora_salida: null,
              equipo: emp.equipo || teamKey,
              team_key: teamKey,
              semana_inicio: weekStart,
              error: `Sin calendario para ${teamKey} semana ${weekStart}`
            });
            continue;
          }

          turno = turnoCalendario; // "Mañana" o "Tarde"

          if (turnoCalendario === "Mañana") {
            hora_entrada = emp.horario_manana_inicio || null;
            hora_salida = emp.horario_manana_fin || null;
          } else {
            hora_entrada = emp.horario_tarde_inicio || null;
            hora_salida = emp.horario_tarde_fin || null;
          }
        }
      } else {
        // Tipo de turno desconocido o no configurado: incluir sin turno claro
        turno = null;
        hora_entrada = emp.horario_manana_inicio || emp.horario_tarde_inicio || null;
        hora_salida = emp.horario_manana_fin || emp.horario_tarde_fin || null;
      }

      result.push({
        employee_id: emp.codigo_empleado,
        employee_db_id: emp.id,
        nombre: emp.nombre,
        departamento: emp.departamento || "Sin Departamento",
        tipo_turno: tipoTurno,
        turno,               // "Mañana" | "Tarde" | "Partido" | null
        hora_entrada,        // "HH:MM"
        hora_salida,         // "HH:MM"
        equipo: emp.equipo || emp.team_key || null,
        team_key: emp.team_key || null,
        semana_inicio: weekStart,
        tipo_jornada: emp.tipo_jornada,
        num_horas_jornada: emp.num_horas_jornada,
      });
    }

    // Separar por turno para facilitar uso en frontend
    const mañana = result.filter(e => e.turno === "Mañana");
    const tarde = result.filter(e => e.turno === "Tarde");
    const partido = result.filter(e => e.turno === "Partido");
    const sinTurno = result.filter(e => !e.turno);

    return Response.json({
      date: targetDate,
      week_start: weekStart,
      total: result.length,
      totals_by_shift: {
        manana: mañana.length,
        tarde: tarde.length,
        partido: partido.length,
        sin_turno: sinTurno.length,
      },
      employees: result,
      manana: mañana,
      tarde: tarde,
      partido,
      sin_turno: sinTurno,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});