/**
 * presenceMonitor - Monitor de presencia en tiempo real
 * 
 * RESPONSABILIDAD: Únicamente actualiza estado_presencia en EmployeeMasterDatabase.
 * NO crea registros de Absence. La creación de ausencias es responsabilidad de shiftAudit.
 * 
 * Esto evita duplicación de ausencias cuando ambos sistemas corren simultáneamente.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getNowSpain() {
  const now = new Date();
  const localStr = now.toLocaleString('en-CA', { timeZone: 'Europe/Madrid', hour12: false });
  return new Date(localStr.replace(',', ''));
}

function getNowSpainMinutes() {
  const now = new Date();
  const localStr = now.toLocaleString('en-US', {
    timeZone: 'Europe/Madrid', hour12: false, hour: '2-digit', minute: '2-digit'
  });
  const [h, m] = localStr.split(':').map(Number);
  return h * 60 + m;
}

function getSpainDateStr() {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getEmployeeShiftInfo(emp, teamShiftMap) {
  let assignedShiftName = null;

  if (emp.tipo_turno === 'Rotativo') {
    if (!emp.team_key) return null;
    assignedShiftName = teamShiftMap[emp.team_key] || null;
  } else if (emp.tipo_turno === 'Fijo Mañana') {
    assignedShiftName = 'Mañana';
  } else if (emp.tipo_turno === 'Fijo Tarde') {
    assignedShiftName = 'Tarde';
  } else if (emp.tipo_turno === 'Turno Partido') {
    const e1 = timeToMinutes(emp.turno_partido_entrada1);
    const s2 = timeToMinutes(emp.turno_partido_salida2) || timeToMinutes(emp.turno_partido_salida1);
    if (e1 !== null) return { turnoNombre: 'Mañana', shiftStart: e1, shiftEnd: s2 };
    return null;
  }

  if (!assignedShiftName) return null;

  if (assignedShiftName === 'Mañana') {
    const start = timeToMinutes(emp.horario_manana_inicio);
    const end = timeToMinutes(emp.horario_manana_fin);
    if (start === null) return null;
    return { turnoNombre: 'Mañana', shiftStart: start, shiftEnd: end };
  }

  if (assignedShiftName === 'Tarde') {
    const start = timeToMinutes(emp.horario_tarde_inicio);
    const end = timeToMinutes(emp.horario_tarde_fin);
    if (start === null) return null;
    return { turnoNombre: 'Tarde', shiftStart: start, shiftEnd: end };
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Autenticación opcional (puede ser llamado por scheduler sin usuario)
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nowSpain = getNowSpain();
    const nowMinutes = getNowSpainMinutes();
    const today = getSpainDateStr();

    // Saltar fines de semana
    const dayOfWeek = nowSpain.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return Response.json({ skipped: true, reason: 'Weekend' });
    }

    // Verificar festivos
    const holidays = await svc.entities.Holiday.filter({ date: today }, 'id', 1).catch(() => []);
    if (holidays && holidays.length > 0) {
      return Response.json({ skipped: true, reason: `Holiday: ${holidays[0]?.name}` });
    }

    // Calendario de rotación (misma lógica que shiftAudit)
    const mondayStr = getMondayOfWeek(nowSpain);
    const allWeekSchedules = await svc.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: mondayStr }).catch(() => []);
    const teamShiftMap = {};
    for (const ws of allWeekSchedules) {
      if (ws.team_key && ws.turno) teamShiftMap[ws.team_key] = ws.turno;
    }

    // Empleados activos sujetos a control
    const employees = await svc.entities.EmployeeMasterDatabase.filter({
      estado_empleado: 'Alta',
      sujeto_a_control_horario: true,
    }, undefined, 2000);

    if (!employees || employees.length === 0) {
      return Response.json({ processed: 0 });
    }

    // Fichajes de hoy
    const attendanceRecords = await svc.entities.AttendanceRecord.filter({ record_date: today }, undefined, 2000).catch(() => []);
    const firstEntryMinutes = {};
    for (const r of attendanceRecords) {
      if (r.direction !== 'E') continue;
      const empId = String(r.employee_id);
      const mins = timeToMinutes(r.record_time);
      if (mins === null) continue;
      if (firstEntryMinutes[empId] === undefined || mins < firstEntryMinutes[empId]) {
        firstEntryMinutes[empId] = mins;
      }
    }
    const presentToday = new Set(Object.keys(firstEntryMinutes));

    // Ausencias activas hoy (para saber si hay ausencia formal)
    const todayDate = new Date(today + 'T12:00:00Z');
    const allAbsences = await svc.entities.Absence.list('-fecha_inicio', 2000).catch(() => []);
    const activeAbsencesMap = {};
    for (const abs of allAbsences) {
      if (abs.estado_aprobacion === 'Rechazada' || abs.estado_aprobacion === 'Cancelada') continue;
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
      if (start <= todayDate && todayDate <= end) {
        if (!activeAbsencesMap[abs.employee_id]) activeAbsencesMap[abs.employee_id] = abs;
      }
    }

    const RETRASO_MIN = 5;
    const AUSENTE_MIN = 30;

    const results = { presentes: 0, retrasos: 0, potencialmente_ausentes: 0, ausentes: 0, sin_turno: 0 };
    let opCount = 0;

    for (const emp of employees) {
      const shiftInfo = getEmployeeShiftInfo(emp, teamShiftMap);

      if (!shiftInfo) { results.sin_turno++; continue; }

      const minutesSinceStart = nowMinutes - shiftInfo.shiftStart;

      // Si el turno no ha comenzado (más de 30 min antes), omitir
      if (minutesSinceStart < -30) { results.sin_turno++; continue; }

      // Si el turno ya terminó hace más de 60 min, omitir
      if (shiftInfo.shiftEnd && nowMinutes > shiftInfo.shiftEnd + 60) { results.sin_turno++; continue; }

      const empCode = String(emp.codigo_empleado || '').trim();
      const hasFichado = empCode && presentToday.has(empCode);
      const absenceFormal = activeAbsencesMap[emp.id];

      opCount++;
      if (opCount % 8 === 0) await sleep(500);

      // ── Con ausencia formal: marcar como Ausente ──
      if (absenceFormal && !hasFichado) {
        if (emp.estado_presencia !== 'Ausente') {
          await svc.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Ausente',
            estado_presencia: 'Ausente',
            ausencia_inicio: absenceFormal.fecha_inicio,
            ausencia_fin: absenceFormal.fecha_fin_desconocida ? null : absenceFormal.fecha_fin,
            ausencia_motivo: absenceFormal.tipo || absenceFormal.motivo,
          }).catch(e => console.warn(`[presenceMonitor] Error ausencia formal ${emp.nombre}:`, e.message));
          results.ausentes++;
        } else {
          results.ausentes++;
        }
        continue;
      }

      // ── Ha fichado: marcar como Presente o Retraso, y reactivar si venía de ausente ──
      if (hasFichado) {
        const fichajeMinutes = firstEntryMinutes[empCode];
        const retrasoReal = fichajeMinutes !== undefined ? fichajeMinutes - shiftInfo.shiftStart : minutesSinceStart;
        const nuevoEstado = retrasoReal > RETRASO_MIN ? 'Retraso' : 'Presente';

        if (['Ausente Auto', 'Ausente', 'Potencialmente Ausente', 'Retraso'].includes(emp.estado_presencia)) {
          // Reactivación: cancelar ausencia auto si existe
          if (absenceFormal && emp.estado_presencia === 'Ausente Auto') {
            await svc.entities.Absence.update(absenceFormal.id, {
              fecha_fin: new Date().toISOString(),
              fecha_fin_desconocida: false,
              estado_aprobacion: 'Cancelada',
              comentario_aprobacion: `[SISTEMA] Fichaje detectado. Presencia física confirmada.`,
            }).catch(e => console.warn(`[presenceMonitor] Error cancelando ausencia:`, e.message));
          }

          await svc.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Disponible',
            estado_presencia: nuevoEstado,
            potencialmente_ausente_desde: null,
            ausencia_motivo: null,
          }).catch(e => console.warn(`[presenceMonitor] Error reactivando ${emp.nombre}:`, e.message));
          results.retrasos++;
        } else if (emp.estado_presencia !== 'Presente' && emp.estado_presencia !== 'Retraso') {
          await svc.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Disponible',
            estado_presencia: nuevoEstado,
            potencialmente_ausente_desde: null,
          }).catch(e => console.warn(`[presenceMonitor] Error marcando presente ${emp.nombre}:`, e.message));
          results.presentes++;
        } else {
          results.presentes++;
        }
        continue;
      }

      // ── Sin fichaje ──
      // IMPORTANTE: NO crear ausencias aquí. Eso es responsabilidad exclusiva de shiftAudit.
      // Solo actualizar estado_presencia para el panel de tiempo real.

      if (minutesSinceStart >= AUSENTE_MIN) {
        // Solo marcar como Ausente Auto si aún no lo está
        if (emp.estado_presencia !== 'Ausente Auto' && emp.estado_presencia !== 'Ausente') {
          await svc.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Ausente',
            estado_presencia: 'Ausente Auto',
            potencialmente_ausente_desde: new Date().toISOString(),
            ausencia_motivo: `Ausencia no comunicada - turno ${shiftInfo.turnoNombre}`,
          }).catch(e => console.warn(`[presenceMonitor] Error marcando ausente ${emp.nombre}:`, e.message));
          results.ausentes++;
        } else {
          results.ausentes++;
        }
      } else if (minutesSinceStart >= RETRASO_MIN) {
        // Potencialmente ausente
        if (!['Potencialmente Ausente', 'Ausente Auto', 'Ausente'].includes(emp.estado_presencia)) {
          await svc.entities.EmployeeMasterDatabase.update(emp.id, {
            estado_presencia: 'Potencialmente Ausente',
            potencialmente_ausente_desde: new Date().toISOString(),
          }).catch(e => console.warn(`[presenceMonitor] Error pot.ausente ${emp.nombre}:`, e.message));
          results.potencialmente_ausentes++;
        } else {
          results.potencialmente_ausentes++;
        }
      } else {
        // Turno recién comenzado sin fichar aún, no hacer nada
        results.sin_turno++;
      }
    }

    console.log(`[presenceMonitor] Resumen:`, JSON.stringify({ today, nowMinutes, ...results }));

    return Response.json({
      success: true,
      today,
      teamShiftMap,
      empleados_procesados: employees.length,
      ...results,
    });

  } catch (error) {
    console.error('[presenceMonitor] Error fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});