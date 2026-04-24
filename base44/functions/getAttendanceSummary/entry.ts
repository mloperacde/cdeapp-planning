import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * getAttendanceSummary
 * 
 * Devuelve un resumen de presencia en tiempo real para planificación de producción:
 * - Empleados presentes ahora (primer E del día sin S final aún)
 * - Desglose por departamento y turno
 * - Disponibilidad de operadores por máquina (cruzando con EmployeeMachineSkill)
 * 
 * Payload: { date: "YYYY-MM-DD" (opcional, default hoy) }
 */

function toMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getSpainDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
}

function getCurrentSpainTime() {
  return new Date().toLocaleTimeString('sv-SE', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' });
}

function isBreakIncident(incident) {
  if (!incident) return false;
  const upper = (incident || '').toUpperCase().trim();
  return upper !== 'N/A' && upper !== '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || getSpainDate();
    const currentTime = getCurrentSpainTime();
    const currentMinutes = toMinutes(currentTime);

    // 1. Obtener fichajes del día
    const records = await base44.asServiceRole.entities.AttendanceRecord.filter(
      { record_date: targetDate }, 'record_time', 3000
    );

    // 2. Obtener datos de empleados, máquinas y habilidades
    const [employees, machineSkills, machines] = await Promise.all([
      base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 1000),
      base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 5000),
      base44.asServiceRole.entities.MachineMasterDatabase.list(undefined, 200)
    ]);

    const empByCode = {};
    const empById = {};
    employees.forEach(e => {
      if (e.codigo_empleado) empByCode[e.codigo_empleado] = e;
      empById[e.id] = e;
    });

    // 3. Procesar estado actual por empleado
    const byEmployee = {};
    records.forEach(r => {
      if (!byEmployee[r.employee_id]) byEmployee[r.employee_id] = [];
      byEmployee[r.employee_id].push(r);
    });

    Object.keys(byEmployee).forEach(code => {
      byEmployee[code].sort((a, b) => (toMinutes(a.record_time) || 0) - (toMinutes(b.record_time) || 0));
    });

    const presentEmployees = [];
    const absentEmployees = [];

    for (const [code, fichajes] of Object.entries(byEmployee)) {
      const emp = empByCode[code];
      if (!emp) continue;
      if (emp.estado_empleado === 'Baja') continue;

      const lastRecord = fichajes[fichajes.length - 1];
      const firstEntry = fichajes.find(f => f.direction === 'E');
      const lastFinalExit = [...fichajes].reverse().find(f => f.direction === 'S' && !isBreakIncident(f.incident));

      // Determinar estado actual
      let status = 'Ausente';
      let statusDetail = '';

      if (firstEntry) {
        if (!lastFinalExit || toMinutes(lastFinalExit.record_time) > currentMinutes) {
          // Ha entrado pero no ha hecho la salida final
          if (lastRecord.direction === 'S' && isBreakIncident(lastRecord.incident)) {
            status = 'En Pausa';
            statusDetail = lastRecord.incident;
          } else {
            status = 'Presente';
          }
        } else {
          status = 'Completado';
          statusDetail = `Salida: ${lastFinalExit.record_time}`;
        }
      }

      // Turno por hora de entrada
      let shift = 'N/A';
      if (firstEntry) {
        const mins = toMinutes(firstEntry.record_time);
        if (mins !== null) {
          if (mins >= 360 && mins < 840) shift = 'Mañana';
          else if (mins >= 840 && mins < 1320) shift = 'Tarde';
          else shift = 'Noche';
        }
      }

      const empSummary = {
        id: emp.id,
        code,
        name: emp.nombre,
        department: emp.departamento || fichajes[0]?.department || 'Sin Departamento',
        department_id: emp.department_id,
        shift,
        status,
        statusDetail,
        entry_time: firstEntry?.record_time || null,
        exit_time: lastFinalExit?.record_time || null,
        puesto: emp.puesto || '',
        team_key: emp.team_key || ''
      };

      if (status === 'Presente' || status === 'En Pausa') {
        presentEmployees.push(empSummary);
      } else {
        absentEmployees.push(empSummary);
      }
    }

    // 4. Desglose por departamento y turno
    const byDeptAndShift = {};
    presentEmployees.forEach(emp => {
      const key = emp.department || 'Sin Departamento';
      if (!byDeptAndShift[key]) byDeptAndShift[key] = { Mañana: [], Tarde: [], Noche: [], 'N/A': [] };
      byDeptAndShift[key][emp.shift] = byDeptAndShift[key][emp.shift] || [];
      byDeptAndShift[key][emp.shift].push({ name: emp.name, status: emp.status });
    });

    // 5. Disponibilidad por máquina
    const presentIds = new Set(presentEmployees.map(e => e.id));

    const machineAvailability = [];
    machines.forEach(machine => {
      const qualifiedSkills = machineSkills.filter(s => s.machine_id === machine.id);
      const presentOperators = qualifiedSkills
        .filter(s => presentIds.has(s.employee_id))
        .map(s => {
          const emp = empById[s.employee_id];
          return {
            employee_id: s.employee_id,
            name: emp?.nombre || 'Desconocido',
            level: s.nivel_habilidad || 'Intermedio',
            priority: s.orden_preferencia || 99
          };
        })
        .sort((a, b) => a.priority - b.priority);

      machineAvailability.push({
        machine_id: machine.id,
        machine_name: machine.nombre,
        machine_code: machine.codigo_maquina,
        area: machine.area_name || '',
        total_qualified: qualifiedSkills.length,
        present_qualified: presentOperators.length,
        operators: presentOperators.slice(0, 10)
      });
    });

    // Ordenar máquinas: primero las que tienen operadores presentes
    machineAvailability.sort((a, b) => b.present_qualified - a.present_qualified);

    return Response.json({
      success: true,
      date: targetDate,
      current_time: currentTime,
      total_present: presentEmployees.length,
      total_on_break: presentEmployees.filter(e => e.status === 'En Pausa').length,
      total_completed: absentEmployees.filter(e => e.status === 'Completado').length,
      by_department_shift: byDeptAndShift,
      present_employees: presentEmployees,
      machine_availability: machineAvailability
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});