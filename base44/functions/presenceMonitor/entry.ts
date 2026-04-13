import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SPAIN_OFFSET = 2; // UTC+2 CEST (horario de verano España)

function todayAtTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    h - SPAIN_OFFSET, m, 0
  ));
}

// Devuelve el número de semana ISO del año para una fecha
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getActiveTurnoStart(emp, assignedShift) {
  // assignedShift: 'Mañana' | 'Tarde' | null (null = usar todos los horarios)
  const now = new Date();
  const shifts = [];

  if (!assignedShift || assignedShift === 'Mañana') {
    if (emp.horario_manana_inicio) shifts.push(emp.horario_manana_inicio);
  }
  if (!assignedShift || assignedShift === 'Tarde') {
    if (emp.horario_tarde_inicio) shifts.push(emp.horario_tarde_inicio);
  }
  // Turno partido siempre se incluye si no hay assignedShift
  if (!assignedShift) {
    if (emp.turno_partido_entrada1) shifts.push(emp.turno_partido_entrada1);
    if (emp.turno_partido_entrada2) shifts.push(emp.turno_partido_entrada2);
  }

  const candidates = [];
  for (const t of shifts) {
    if (!t) continue;
    const shiftStart = todayAtTime(t);
    if (!shiftStart) continue;
    const diffMin = (now - shiftStart) / 60000;
    if (diffMin >= 5 && diffMin <= 480) candidates.push({ shiftStart, diffMin });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.diffMin - b.diffMin);
  return candidates[0];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = todayISO();
    const now = new Date();
    const dayOfWeek = now.getUTCDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return Response.json({ skipped: true, reason: 'Weekend', timestamp: now.toISOString() });
    }

    await sleep(200);
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({
      estado_empleado: 'Alta',
      sujeto_a_control_horario: true,
    });

    if (!employees || employees.length === 0) {
      return Response.json({ processed: 0, timestamp: now.toISOString() });
    }

    // Cargar calendario de rotación semanal para la semana actual
    await sleep(200);
    const currentWeek = getISOWeek(now);
    const currentYear = now.getUTCFullYear();
    const weekSchedules = await base44.asServiceRole.entities.TeamWeekSchedule.filter({
      year: currentYear,
      week_number: currentWeek,
    });
    // Mapa: team_key -> turno asignado esta semana ('Mañana' | 'Tarde')
    const teamShiftMap = {};
    for (const ws of weekSchedules) {
      if (ws.team_key && ws.shift) teamShiftMap[ws.team_key] = ws.shift;
    }

    await sleep(200);
    const attendanceRecords = await base44.asServiceRole.entities.AttendanceRecord.filter({ record_date: today });
    const presentToday = new Set(
      attendanceRecords.filter(r => r.direction === 'E').map(r => r.employee_id)
    );

    await sleep(200);
    const existingAbsences = await base44.asServiceRole.entities.Absence.filter({});
    const autoAbsencesToday = existingAbsences.filter(a =>
      a.motivo?.startsWith('AUTO:') &&
      a.fecha_inicio?.startsWith(today) &&
      a.estado_aprobacion === 'Pendiente'
    );
    const autoAbsenceByEmp = new Map(autoAbsencesToday.map(a => [a.employee_id, a]));

    const results = {
      potencialmente_ausentes: [],
      retrasados: [],
      ausencias_auto_creadas: [],
      reactivaciones: [],
      sin_cambios: 0,
    };

    let opCount = 0;

    for (const emp of employees) {
      if (opCount > 0 && opCount % 4 === 0) await sleep(600);
      opCount++;

      const empCode = emp.codigo_empleado;
      const isPresent = empCode && presentToday.has(empCode);
      // Determinar turno asignado según calendario de rotación (solo para rotativos)
      let assignedShift = null;
      if (emp.tipo_turno === 'Rotativo' && emp.team_key) {
        assignedShift = teamShiftMap[emp.team_key] || null;
      } else if (emp.tipo_turno === 'Fijo Mañana') {
        assignedShift = 'Mañana';
      } else if (emp.tipo_turno === 'Fijo Tarde') {
        assignedShift = 'Tarde';
      }
      const turno = getActiveTurnoStart(emp, assignedShift);

      if (!turno) { results.sin_cambios++; continue; }

      const minutesSinceStart = turno.diffMin;

      if (isPresent) {
        const autoAbsence = autoAbsenceByEmp.get(emp.id);
        if (autoAbsence) {
          await base44.asServiceRole.entities.Absence.update(autoAbsence.id, {
            estado_aprobacion: 'Cancelada',
            notas: `Cancelada automáticamente: empleado registró presencia a las ${now.toISOString()}`,
          });
          await sleep(150);
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Disponible',
            estado_presencia: minutesSinceStart > 5 ? 'Retraso' : 'Presente',
            ausencia_motivo: null,
          });
          await sleep(150);
          await base44.asServiceRole.entities.AbsenceAuditLog.create({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || '',
            action_type: 'reactivacion_por_presencia',
            absence_id: autoAbsence.id,
            sync_date: today,
            origen: 'cucoSyncV2',
            estado_anterior: 'Ausente',
            estado_nuevo: 'Disponible',
            motivo: `Empleado fichó entrada a los ${Math.round(minutesSinceStart)} min del inicio de turno. Ausencia auto cancelada.`,
            leido_por_rrhh: false,
          });
          results.reactivaciones.push(emp.nombre);
          continue;
        }

        if (emp.estado_presencia === 'Potencialmente Ausente') {
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
            estado_presencia: 'Retraso',
            disponibilidad: 'Disponible',
          });
          await sleep(150);
          await base44.asServiceRole.entities.AbsenceAuditLog.create({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || '',
            action_type: 'reactivacion_por_presencia',
            sync_date: today,
            origen: 'cucoSyncV2',
            estado_anterior: 'Potencialmente Ausente',
            estado_nuevo: 'Retraso',
            motivo: `Empleado fichó con ${Math.round(minutesSinceStart)} min de retraso.`,
            leido_por_rrhh: false,
          });
          results.retrasados.push(emp.nombre);
          continue;
        }

        if (emp.estado_presencia !== 'Presente' && emp.estado_presencia !== 'Retraso') {
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
            estado_presencia: 'Presente',
            disponibilidad: 'Disponible',
          });
        }
        results.sin_cambios++;
        continue;
      }

      // No ha fichado
      const hasActiveManualAbsence = existingAbsences.some(a =>
        a.employee_id === emp.id &&
        a.estado_aprobacion !== 'Cancelada' &&
        a.estado_aprobacion !== 'Rechazada' &&
        new Date(a.fecha_inicio) <= now &&
        (a.fecha_fin_desconocida || new Date(a.fecha_fin) >= now)
      );

      if (hasActiveManualAbsence) { results.sin_cambios++; continue; }

      if (minutesSinceStart >= 5 && minutesSinceStart < 35) {
        if (emp.estado_presencia !== 'Potencialmente Ausente' &&
            emp.estado_presencia !== 'Ausente' &&
            emp.estado_presencia !== 'Ausente Auto') {
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
            estado_presencia: 'Potencialmente Ausente',
            potencialmente_ausente_desde: now.toISOString(),
          });
          await sleep(150);
          await base44.asServiceRole.entities.AbsenceAuditLog.create({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || '',
            action_type: 'ausencia_auto_creada',
            sync_date: today,
            origen: 'cucoSyncV2',
            estado_anterior: 'Disponible',
            estado_nuevo: 'Potencialmente Ausente',
            motivo: `Sin fichaje ${Math.round(minutesSinceStart)} min después del inicio de turno. Auto-ausencia en ${Math.round(35 - minutesSinceStart)} min.`,
            leido_por_rrhh: false,
          });
          results.potencialmente_ausentes.push(emp.nombre);
        }
      } else if (minutesSinceStart >= 35) {
        const existingAutoAbsence = autoAbsenceByEmp.get(emp.id);
        if (!existingAutoAbsence && emp.estado_presencia !== 'Ausente Auto') {
          const newAbsence = await base44.asServiceRole.entities.Absence.create({
            employee_id: emp.id,
            fecha_inicio: new Date(Date.UTC(
              now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
              turno.shiftStart.getUTCHours(), turno.shiftStart.getUTCMinutes(), 0
            )).toISOString(),
            fecha_fin_desconocida: true,
            motivo: `AUTO: Sin fichaje de entrada. Turno iniciado sin presencia registrada.`,
            tipo: 'Ausencia No Justificada',
            remunerada: false,
            estado_aprobacion: 'Pendiente',
            notas: `Ausencia generada automáticamente. Pendiente de revisión por RRHH.`,
          });
          await sleep(150);
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Ausente',
            estado_presencia: 'Ausente Auto',
            ausencia_inicio: now.toISOString(),
            ausencia_motivo: 'Ausencia automática - Sin fichaje',
          });
          await sleep(150);
          await base44.asServiceRole.entities.AbsenceAuditLog.create({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || '',
            action_type: 'ausencia_auto_creada',
            absence_id: newAbsence.id,
            sync_date: today,
            origen: 'cucoSyncV2',
            estado_anterior: 'Potencialmente Ausente',
            estado_nuevo: 'Ausente',
            motivo: `Ausencia auto-creada: ${Math.round(minutesSinceStart)} min sin fichaje. Requiere aprobación de RRHH.`,
            leido_por_rrhh: false,
          });
          results.ausencias_auto_creadas.push(emp.nombre);
        }
      }
    }

    return Response.json({
      success: true,
      timestamp: now.toISOString(),
      today,
      summary: {
        empleados_procesados: employees.length,
        potencialmente_ausentes: results.potencialmente_ausentes.length,
        retrasados: results.retrasados.length,
        ausencias_auto_creadas: results.ausencias_auto_creadas.length,
        reactivaciones: results.reactivaciones.length,
      },
      details: results,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});