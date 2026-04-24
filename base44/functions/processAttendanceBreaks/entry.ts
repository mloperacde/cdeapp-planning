import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * processAttendanceBreaks
 * 
 * Procesa los AttendanceRecords de una fecha dada para:
 * 1. Identificar el primer E y último S (N/A) de cada empleado → jornada real
 * 2. Detectar interrupciones intermedias (S con incident != N/A seguido de E) → BreakRecord
 * 
 * Payload: { date: "YYYY-MM-DD" (opcional, default hoy), dry_run: false }
 */

const BREAK_INCIDENTS = ['VESTUARIOS/ASEOS', 'VESTUARIOS', 'ASEOS', 'DESCANSO'];

function toMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getSpainDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
}

function isBreakIncident(incident) {
  if (!incident) return false;
  const upper = incident.toUpperCase().trim();
  if (upper === 'N/A' || upper === '' || upper === '-') return false;
  // Solo es pausa si coincide explícitamente con tipos conocidos O si es cualquier incidente no vacío y no N/A
  return upper.length > 0 && upper !== 'N/A';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || getSpainDate();
    const dryRun = body.dry_run === true;

    // 1. Obtener todos los fichajes del día
    const records = await base44.asServiceRole.entities.AttendanceRecord.filter(
      { record_date: targetDate },
      'record_time',
      2000
    );

    if (!records || records.length === 0) {
      return Response.json({ message: `No hay fichajes para ${targetDate}`, date: targetDate, processed: 0 });
    }

    // 2. Obtener empleados para cruzar datos
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 1000);
    const empByCode = {};
    employees.forEach(e => {
      if (e.codigo_empleado) empByCode[e.codigo_empleado] = e;
    });

    // 3. Agrupar fichajes por empleado
    const byEmployee = {};
    records.forEach(r => {
      const code = r.employee_id;
      if (!byEmployee[code]) byEmployee[code] = [];
      byEmployee[code].push(r);
    });

    // Ordenar por hora dentro de cada grupo
    Object.keys(byEmployee).forEach(code => {
      byEmployee[code].sort((a, b) => {
        const at = toMinutes(a.record_time) ?? 0;
        const bt = toMinutes(b.record_time) ?? 0;
        return at - bt;
      });
    });

    // 4. Procesar cada empleado
    const breakResults = [];
    const dailySummaries = [];

    for (const [code, fichajes] of Object.entries(byEmployee)) {
      const empData = empByCode[code];
      const empName = fichajes[0]?.employee_name || `Empleado ${code}`;
      const empId = empData?.id || null;
      const dept = fichajes[0]?.department || empData?.departamento || '';

      // Determinar turno según departamento/equipo (simplificado por hora de entrada)
      const firstEntry = fichajes.find(f => f.direction === 'E');
      let shift = 'N/A';
      if (firstEntry) {
        const mins = toMinutes(firstEntry.record_time);
        if (mins !== null) {
          if (mins >= 360 && mins < 840) shift = 'Mañana';   // 06:00 - 14:00
          else if (mins >= 840 && mins < 1320) shift = 'Tarde'; // 14:00 - 22:00
          else shift = 'Noche';
        }
      }

      // Primer E y último S(N/A) → jornada real
      const allEntries = fichajes.filter(f => f.direction === 'E');
      const allExits = fichajes.filter(f => f.direction === 'S' && !isBreakIncident(f.incident));
      const firstE = allEntries[0];
      const lastS = allExits[allExits.length - 1];

      const workStart = firstE?.record_time || null;
      const workEnd = lastS?.record_time || null;
      let totalWorkMinutes = null;
      if (workStart && workEnd) {
        totalWorkMinutes = toMinutes(workEnd) - toMinutes(workStart);
        if (totalWorkMinutes < 0) totalWorkMinutes = null;
      }

      // Detectar interrupciones: S con incidente seguido del E siguiente
      const breakRecords = [];
      for (let i = 0; i < fichajes.length; i++) {
        const f = fichajes[i];
        if (f.direction === 'S' && isBreakIncident(f.incident)) {
          // Buscar el siguiente E
          const nextEntry = fichajes.slice(i + 1).find(nf => nf.direction === 'E');
          if (nextEntry) {
            const duration = toMinutes(nextEntry.record_time) - toMinutes(f.record_time);
            breakRecords.push({
              employee_id: empId || code,
              employee_name: empName,
              employee_code: code,
              department: dept,
              record_date: targetDate,
              shift,
              break_type: f.incident?.toUpperCase()?.trim() || 'INTERRUPCIÓN',
              break_start: f.record_time,
              break_end: nextEntry.record_time,
              duration_minutes: duration >= 0 ? duration : 0,
              work_session_start: workStart,
              work_session_end: workEnd,
              total_work_minutes: totalWorkMinutes,
              import_batch: `auto_${targetDate}`
            });
          }
        }
      }

      // Resumen diario del empleado
      dailySummaries.push({
        code,
        name: empName,
        dept,
        shift,
        workStart,
        workEnd,
        totalWorkMinutes,
        breakCount: breakRecords.length,
        totalBreakMinutes: breakRecords.reduce((s, b) => s + (b.duration_minutes || 0), 0),
        status: workStart ? (workEnd ? 'Completada' : 'En Turno') : 'Sin Fichaje'
      });

      breakResults.push(...breakRecords);
    }

    // 5. Guardar BreakRecords (si no es dry_run)
    let saved = 0;
    let skipped = 0;

    if (!dryRun && breakResults.length > 0) {
      // Eliminar registros del día anteriores para evitar duplicados
      const existing = await base44.asServiceRole.entities.BreakRecord.filter({ record_date: targetDate }, undefined, 2000);
      for (const ex of existing) {
        await base44.asServiceRole.entities.BreakRecord.delete(ex.id);
      }
      skipped = existing.length;

      // Insertar nuevos
      for (const br of breakResults) {
        await base44.asServiceRole.entities.BreakRecord.create(br);
        saved++;
      }
    }

    return Response.json({
      success: true,
      date: targetDate,
      dry_run: dryRun,
      employees_processed: Object.keys(byEmployee).length,
      breaks_detected: breakResults.length,
      breaks_saved: saved,
      previous_records_replaced: skipped,
      daily_summaries: dailySummaries.slice(0, 50), // limitar respuesta
      break_details: dryRun ? breakResults.slice(0, 20) : []
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});