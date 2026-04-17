/**
 * shiftAudit - Sistema de Auditoría de Presencia por Turno
 * 
 * Lógica de turnos:
 * - Unidad de control: el TURNO (Mañana / Tarde)
 * - Al INICIO de cada turno: se evalúa presencia de empleados de ese turno
 * - Al CIERRE de cada turno: se resetea estado_presencia a "No Aplica"
 * - Se registra todo en AbsenceAuditLog con turno_afectado
 * 
 * Parámetros body:
 *   mode: "check_morning"  → Auditoria turno mañana (tras inicio)
 *   mode: "check_afternoon"→ Auditoria turno tarde (tras inicio)
 *   mode: "close_morning"  → Cierre/reset turno mañana (fin de turno)
 *   mode: "close_afternoon"→ Cierre/reset turno tarde (fin de turno)
 * 
 * Umbrales:
 *   RETRASO: 5-29 min tras inicio sin fichar
 *   AUSENTE_AUTO: ≥30 min tras inicio sin fichar → crea Absence formal
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Utilidades de tiempo (España) ──────────────────────────────────────────

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

function minutesToTime(minutes) {
  if (minutes === null || minutes === undefined) return '--:--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Obtiene la fecha de inicio de semana (lunes) en formato YYYY-MM-DD
 * para la fecha dada.
 */
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

/**
 * Determina el turno y horario esperado para un empleado dado.
 * Retorna: { turnoNombre, shiftStart, shiftEnd } o null si no aplica
 */
function getEmployeeShiftInfo(emp, teamShiftMap) {
  let assignedShiftName = null;

  if (emp.tipo_turno === 'Rotativo') {
    if (!emp.team_key) return null; // Sin team_key → no se puede determinar turno, omitir
    assignedShiftName = teamShiftMap[emp.team_key] || null;
  } else if (emp.tipo_turno === 'Fijo Mañana') {
    assignedShiftName = 'Mañana';
  } else if (emp.tipo_turno === 'Fijo Tarde') {
    assignedShiftName = 'Tarde';
  } else if (emp.tipo_turno === 'Turno Partido') {
    const e1 = timeToMinutes(emp.turno_partido_entrada1);
    const s2 = timeToMinutes(emp.turno_partido_salida2) || timeToMinutes(emp.turno_partido_salida1);
    if (e1 !== null) {
      return { turnoNombre: 'Mañana', shiftStart: e1, shiftEnd: s2 };
    }
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

async function retryOp(fn, retries = 3, baseDelay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i < retries - 1) {
        await sleep(baseDelay * (i + 1));
        continue;
      }
      throw e;
    }
  }
}

// ── Handler Principal ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { mode = 'check_morning', force = false } = body;

    const nowSpain = getNowSpain();
    const nowMinutes = getNowSpainMinutes();
    const today = getSpainDateStr();
    const systemNow = new Date().toISOString();

    console.log(`[shiftAudit] mode=${mode} | hora=${minutesToTime(nowMinutes)} | fecha=${today}`);

    // Saltar fines de semana (excepto si force=true)
    if (!force) {
      const dayOfWeek = nowSpain.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return Response.json({ skipped: true, reason: 'Weekend', mode });
      }
      // Verificar festivos
      const holidays = await svc.entities.Holiday.filter({ date: today }, 'id', 1).catch(() => []);
      if (holidays && holidays.length > 0) {
        return Response.json({ skipped: true, reason: `Holiday: ${holidays[0].name}`, mode });
      }
    }

    // ── Cargar datos necesarios ────────────────────────────────────────────

    // Calendario de rotación semanal: buscamos por fecha_inicio_semana (lunes de esta semana)
    const mondayStr = getMondayOfWeek(nowSpain);
    const allWeekSchedules = await retryOp(() =>
      svc.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: mondayStr })
    ).catch(() => []);

    // teamShiftMap: team_key → 'Mañana' | 'Tarde'
    const teamShiftMap = {};
    for (const ws of allWeekSchedules) {
      if (ws.team_key && ws.turno) teamShiftMap[ws.team_key] = ws.turno;
    }
    console.log(`[shiftAudit] Semana ${mondayStr} - turnos:`, JSON.stringify(teamShiftMap));

    // Empleados activos sujetos a control
    const employees = await retryOp(() =>
      svc.entities.EmployeeMasterDatabase.filter({
        estado_empleado: 'Alta',
        sujeto_a_control_horario: true,
      }, undefined, 2000)
    );

    if (!employees || employees.length === 0) {
      return Response.json({ success: true, processed: 0, mode });
    }

    // Fichajes de entrada de hoy
    const attendanceRecords = await retryOp(() =>
      svc.entities.AttendanceRecord.filter({ record_date: today }, undefined, 2000)
    ).catch(() => []);
    const presentToday = new Set(
      attendanceRecords.filter(r => r.direction === 'E').map(r => String(r.employee_id))
    );

    // Ausencias activas hoy
    const todayDate = new Date(today + 'T12:00:00Z');
    const allAbsences = await retryOp(() =>
      svc.entities.Absence.list('-fecha_inicio', 2000)
    ).catch(() => []);
    const activeAbsencesMap = {};
    for (const abs of allAbsences) {
      if (abs.estado_aprobacion === 'Rechazada' || abs.estado_aprobacion === 'Cancelada') continue;
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
      if (start <= todayDate && todayDate <= end) {
        if (!activeAbsencesMap[abs.employee_id]) activeAbsencesMap[abs.employee_id] = abs;
      }
    }

    // Helper para escribir audit log
    const writeAuditLog = async (entry) => {
      await retryOp(() => svc.entities.AbsenceAuditLog.create({
        ...entry,
        hora_evento: systemNow,
      })).catch(e => console.warn(`[shiftAudit] Error audit log:`, e.message));
    };

    // UMBRALES
    const RETRASO_MIN = 5;    // minutos desde inicio turno → Retraso
    const AUSENTE_MIN = 30;   // minutos desde inicio turno → Ausente Auto

    const results = {
      presentes: 0,
      retrasos: 0,
      ausentes_auto: 0,
      ausentes_formales: 0,
      reactivados: 0,
      reseteados: 0,
      sin_turno: 0,
    };

    // ========================================================================
    // MODO: CIERRE DE TURNO - Reset estado_presencia → "No Aplica"
    // ========================================================================
    if (mode === 'close_morning' || mode === 'close_afternoon') {
      const turnoNombre = mode === 'close_morning' ? 'Mañana' : 'Tarde';
      console.log(`[shiftAudit] CIERRE de turno ${turnoNombre}`);

      let opCount = 0;
      for (const emp of employees) {
        const shiftInfo = getEmployeeShiftInfo(emp, teamShiftMap);
        if (!shiftInfo || shiftInfo.turnoNombre !== turnoNombre) continue;

        // Solo resetear si el empleado tenía un estado activo de este turno
        if (emp.estado_presencia === 'No Aplica') { results.sin_turno++; continue; }

        opCount++;
        if (opCount % 3 === 0) await sleep(1000);

        await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
          estado_presencia: 'No Aplica',
          potencialmente_ausente_desde: null,
        })).catch(e => console.warn(`[shiftAudit] Error reset ${emp.nombre}:`, e.message));

        // Solo loguear si tenía un estado relevante (no resetear "Presente" limpio)
        if (['Retraso', 'Potencialmente Ausente', 'Ausente Auto', 'Ausente'].includes(emp.estado_presencia)) {
          await writeAuditLog({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || '',
            action_type: 'turno_reset',
            absence_id: null,
            sync_date: today,
            turno_afectado: turnoNombre,
            turno_inicio_esperado: minutesToTime(shiftInfo.shiftStart),
            turno_fin_esperado: minutesToTime(shiftInfo.shiftEnd),
            origen: 'shiftAudit',
            estado_anterior: emp.estado_presencia,
            estado_nuevo: 'No Aplica',
            motivo: `Cierre de turno ${turnoNombre}. Estado anterior: ${emp.estado_presencia}. Reseteo para próximo turno.`,
            leido_por_rrhh: false,
          });
        }
        results.reseteados++;
      }

      console.log(`[shiftAudit] CIERRE turno ${turnoNombre}: ${results.reseteados} empleados reseteados`);
      return Response.json({
        success: true,
        mode,
        turno: turnoNombre,
        today,
        reseteados: results.reseteados,
      });
    }

    // ========================================================================
    // MODO: CHECK DE TURNO - Auditoría de presencia
    // ========================================================================
    const turnoObjetivo = mode === 'check_afternoon' ? 'Tarde' : 'Mañana';
    console.log(`[shiftAudit] CHECK turno ${turnoObjetivo} | ${minutesToTime(nowMinutes)}`);

    let opCount = 0;
    for (const emp of employees) {
      const shiftInfo = getEmployeeShiftInfo(emp, teamShiftMap);

      // Solo procesar empleados cuyo turno coincide con el objetivo
      if (!shiftInfo || shiftInfo.turnoNombre !== turnoObjetivo) {
        results.sin_turno++;
        continue;
      }

      const minutesSinceStart = nowMinutes - shiftInfo.shiftStart;

      // Si el turno todavía no ha comenzado, omitir
      if (minutesSinceStart < 0) {
        results.sin_turno++;
        continue;
      }

      const empCode = String(emp.codigo_empleado || '').trim();
      const hasFichado = empCode && presentToday.has(empCode);
      const absenceFormal = activeAbsencesMap[emp.id];

      opCount++;
      if (opCount % 5 === 0) await sleep(600);

      // ── CASO 1: Tiene ausencia formal aprobada ──────────────────────────
      if (absenceFormal && !hasFichado) {
        if (emp.estado_presencia !== 'Ausente') {
          await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Ausente',
            estado_presencia: 'Ausente',
            ausencia_inicio: absenceFormal.fecha_inicio,
            ausencia_fin: absenceFormal.fecha_fin_desconocida ? null : absenceFormal.fecha_fin,
            ausencia_motivo: absenceFormal.tipo || absenceFormal.motivo,
          })).catch(e => console.warn(`[shiftAudit] Error ausencia formal ${emp.nombre}:`, e.message));

          await writeAuditLog({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || '',
            action_type: 'ausencia_confirmada',
            absence_id: absenceFormal.id,
            sync_date: today,
            turno_afectado: turnoObjetivo,
            turno_inicio_esperado: minutesToTime(shiftInfo.shiftStart),
            turno_fin_esperado: minutesToTime(shiftInfo.shiftEnd),
            origen: 'shiftAudit',
            estado_anterior: emp.estado_presencia || 'Disponible',
            estado_nuevo: 'Ausente',
            motivo: `Ausencia formal activa: ${absenceFormal.tipo || absenceFormal.motivo}`,
            leido_por_rrhh: false,
          });
          results.ausentes_formales++;
        }
        continue;
      }

      // ── CASO 2: Ha fichado → Presente (o Retraso si tarde) ─────────────
      if (hasFichado) {
        const nuevoEstado = minutesSinceStart > RETRASO_MIN ? 'Retraso' : 'Presente';

        // Reactivación: venía de ausente/potencialmente ausente
        if (['Ausente Auto', 'Ausente', 'Potencialmente Ausente', 'Retraso'].includes(emp.estado_presencia)) {
          // Si tenía ausencia auto, cerrarla
          if (absenceFormal && emp.estado_presencia === 'Ausente Auto') {
            await retryOp(() => svc.entities.Absence.update(absenceFormal.id, {
              fecha_fin: systemNow,
              fecha_fin_desconocida: false,
              estado_aprobacion: 'Cancelada',
              comentario_aprobacion: `[SISTEMA] Fichaje detectado a las ${minutesToTime(nowMinutes)}. Presencia física prevalece.`,
            })).catch(e => console.warn(`[shiftAudit] Error cerrando ausencia ${emp.nombre}:`, e.message));
          }

          await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Disponible',
            estado_presencia: nuevoEstado,
            potencialmente_ausente_desde: null,
            ausencia_motivo: null,
          })).catch(e => console.warn(`[shiftAudit] Error reactivando ${emp.nombre}:`, e.message));

          await writeAuditLog({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || '',
            action_type: 'reactivacion_por_presencia',
            absence_id: absenceFormal?.id || null,
            sync_date: today,
            turno_afectado: turnoObjetivo,
            turno_inicio_esperado: minutesToTime(shiftInfo.shiftStart),
            turno_fin_esperado: minutesToTime(shiftInfo.shiftEnd),
            origen: 'shiftAudit',
            estado_anterior: emp.estado_presencia,
            estado_nuevo: nuevoEstado,
            motivo: `Fichaje detectado a los ${Math.round(minutesSinceStart)} min del inicio de turno. ${nuevoEstado === 'Retraso' ? 'Marcado como retraso.' : 'Presente.'} ${absenceFormal ? 'Ausencia auto cancelada.' : ''}`,
            leido_por_rrhh: false,
          });
          results.reactivados++;
        } else if (emp.estado_presencia !== 'Presente' && emp.estado_presencia !== 'Retraso') {
          // Primera vez que se detecta el fichaje
          await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: 'Disponible',
            estado_presencia: nuevoEstado,
            potencialmente_ausente_desde: null,
          })).catch(e => console.warn(`[shiftAudit] Error marcando presente ${emp.nombre}:`, e.message));

          if (nuevoEstado === 'Retraso') {
            await writeAuditLog({
              employee_id: emp.id,
              employee_name: emp.nombre,
              employee_dept: emp.departamento || '',
              action_type: 'retraso_detectado',
              absence_id: null,
              sync_date: today,
              turno_afectado: turnoObjetivo,
              turno_inicio_esperado: minutesToTime(shiftInfo.shiftStart),
              turno_fin_esperado: minutesToTime(shiftInfo.shiftEnd),
              origen: 'shiftAudit',
              estado_anterior: emp.estado_presencia || 'No Aplica',
              estado_nuevo: 'Retraso',
              motivo: `Fichaje con ${Math.round(minutesSinceStart)} min de retraso sobre turno ${turnoObjetivo} (${minutesToTime(shiftInfo.shiftStart)})`,
              leido_por_rrhh: false,
            });
            results.retrasos++;
          } else {
            results.presentes++;
          }
        } else {
          results.presentes++;
        }
        continue;
      }

      // ── CASO 3: Sin fichaje ─────────────────────────────────────────────
      if (minutesSinceStart >= AUSENTE_MIN) {
        // ≥30 min sin fichar → Ausente Auto
        if (emp.estado_presencia === 'Ausente Auto' || emp.estado_presencia === 'Ausente') {
          // Ya procesado anteriormente, omitir
          results.ausentes_auto++;
          continue;
        }

        const absenceStart = `${today}T${minutesToTime(shiftInfo.shiftStart)}:00`;
        const absenceEnd = shiftInfo.shiftEnd !== null
          ? `${today}T${minutesToTime(shiftInfo.shiftEnd)}:00`
          : `${today}T${minutesToTime(shiftInfo.shiftStart + 480)}:00`;

        const newAbsence = await retryOp(() => svc.entities.Absence.create({
          employee_id: emp.id,
          fecha_inicio: absenceStart,
          fecha_fin: absenceEnd,
          fecha_fin_desconocida: true,
          motivo: 'Ausencia no comunicada - detección automática',
          tipo: 'Ausencia No Justificada',
          estado_aprobacion: 'Pendiente',
          remunerada: false,
          notas: `[shiftAudit] Turno ${turnoObjetivo} (${minutesToTime(shiftInfo.shiftStart)}-${minutesToTime(shiftInfo.shiftEnd)}). Sin fichaje a los ${Math.round(minutesSinceStart)} min. Fecha: ${systemNow}.`,
        })).catch(e => { console.warn(`[shiftAudit] Error creando ausencia ${emp.nombre}:`, e.message); return null; });

        await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: 'Ausente',
          estado_presencia: 'Ausente Auto',
          ausencia_inicio: absenceStart,
          ausencia_motivo: `Ausencia no comunicada - turno ${turnoObjetivo}`,
          potencialmente_ausente_desde: systemNow,
        })).catch(e => console.warn(`[shiftAudit] Error actualizando ${emp.nombre}:`, e.message));

        await writeAuditLog({
          employee_id: emp.id,
          employee_name: emp.nombre,
          employee_dept: emp.departamento || '',
          action_type: 'ausencia_auto_creada',
          absence_id: newAbsence?.id || null,
          sync_date: today,
          turno_afectado: turnoObjetivo,
          turno_inicio_esperado: minutesToTime(shiftInfo.shiftStart),
          turno_fin_esperado: minutesToTime(shiftInfo.shiftEnd),
          origen: 'shiftAudit',
          estado_anterior: emp.estado_presencia || 'No Aplica',
          estado_nuevo: 'Ausente Auto',
          motivo: `Sin fichaje ${Math.round(minutesSinceStart)} min tras inicio turno ${turnoObjetivo} (${minutesToTime(shiftInfo.shiftStart)}). Ausencia automática creada. Pendiente revisión RRHH.`,
          leido_por_rrhh: false,
        });
        results.ausentes_auto++;

      } else if (minutesSinceStart >= RETRASO_MIN) {
        // 5-29 min sin fichar → Potencialmente Ausente
        if (!['Potencialmente Ausente', 'Ausente Auto', 'Ausente'].includes(emp.estado_presencia)) {
          await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
            estado_presencia: 'Potencialmente Ausente',
            potencialmente_ausente_desde: systemNow,
          })).catch(e => console.warn(`[shiftAudit] Error pot.ausente ${emp.nombre}:`, e.message));

          await writeAuditLog({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || '',
            action_type: 'ausencia_confirmada',
            absence_id: null,
            sync_date: today,
            turno_afectado: turnoObjetivo,
            turno_inicio_esperado: minutesToTime(shiftInfo.shiftStart),
            turno_fin_esperado: minutesToTime(shiftInfo.shiftEnd),
            origen: 'shiftAudit',
            estado_anterior: emp.estado_presencia || 'No Aplica',
            estado_nuevo: 'Potencialmente Ausente',
            motivo: `Sin fichaje ${Math.round(minutesSinceStart)} min tras inicio turno ${turnoObjetivo}. Ausencia auto en ~${Math.round(AUSENTE_MIN - minutesSinceStart)} min.`,
            leido_por_rrhh: false,
          });
        }
      }
    }

    const summary = {
      mode,
      turno: turnoObjetivo,
      today,
      hora_ejecucion: minutesToTime(nowMinutes),
      semana_inicio: mondayStr,
      turnos_configurados: teamShiftMap,
      empleados_procesados: employees.length,
      ...results,
    };

    console.log(`[shiftAudit] Resumen: ${JSON.stringify(summary)}`);

    return Response.json({ success: true, ...summary });

  } catch (err) {
    console.error('[shiftAudit] Error fatal:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});