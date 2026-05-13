/**
 * shiftAudit - Sistema de Auditoría de Presencia por Turno
 * 
 * ARQUITECTURA (inspirada en sistemas HCM profesionales como Workday/SuccessFactors):
 * 
 * PRINCIPIO DE IDEMPOTENCIA: Cada ejecución del sistema debe producir el mismo
 * resultado independientemente de cuántas veces se ejecute. Para garantizarlo:
 * 
 * 1. ANTES de crear cualquier ausencia auto-generada, se verifica en la BD si
 *    ya existe una ausencia activa para ese empleado en ese día (control real).
 * 2. El campo estado_presencia del empleado es un CACHE de presentación, no la
 *    fuente de verdad. La fuente de verdad es la tabla Absence.
 * 3. Las ausencias auto-generadas son SIEMPRE revisables por RRHH y nunca
 *    impactan en nómina sin aprobación explícita.
 * 
 * Modos:
 *   check_morning  → Auditoría turno mañana
 *   check_afternoon→ Auditoría turno tarde  
 *   close_morning  → Cierre/reset turno mañana
 *   close_afternoon→ Cierre/reset turno tarde
 * 
 * Umbrales:
 *   RETRASO: 5-29 min → Potencialmente Ausente (sin crear Absence)
 *   AUSENTE_AUTO: ≥30 min → crea Absence solo si NO existe ya una hoy
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

function minutesToTime(minutes) {
  if (minutes === null || minutes === undefined) return '--:--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Auth: permitir scheduler (sin token de usuario) o admin autenticado
    const user = await base44.auth.me().catch(() => null);
    if (user && user.email) {
      const userRole = (user.role || '').trim().toLowerCase();
      if (userRole !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

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
      const holidays = await svc.entities.Holiday.filter({ date: today }, 'id', 1).catch(() => []);
      if (holidays && holidays.length > 0) {
        return Response.json({ skipped: true, reason: `Holiday: ${holidays[0].name}`, mode });
      }
    }

    // ── Cargar datos necesarios ────────────────────────────────────────────
    const mondayStr = getMondayOfWeek(nowSpain);
    const allWeekSchedules = await retryOp(() =>
      svc.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: mondayStr })
    ).catch(() => []);

    const teamShiftMap = {};
    for (const ws of allWeekSchedules) {
      if (ws.team_key && ws.turno) teamShiftMap[ws.team_key] = ws.turno;
    }
    console.log(`[shiftAudit] Semana ${mondayStr} - turnos:`, JSON.stringify(teamShiftMap));

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

    // ── CARGA COMPLETA DE AUSENCIAS HOY (fuente de verdad para idempotencia) ──
    // Cargamos TODAS las ausencias activas hoy de una sola vez para hacer
    // lookups en memoria O(1) sin queries adicionales por empleado.
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayEnd = new Date(today + 'T23:59:59Z');
    const allAbsences = await retryOp(() =>
      svc.entities.Absence.list('-created_date', 5000)
    ).catch(() => []);

    // Mapa: employee_id → lista de ausencias activas hoy (no canceladas/rechazadas)
    // Separamos: formales (no-auto) y automáticas (shiftAudit)
    const activeFormalAbsencesMap = {};   // Ausencias manuales/aprobadas activas hoy
    const activeAutoAbsencesMap = {};     // Ausencias auto del sistema activas hoy

    for (const abs of allAbsences) {
      if (abs.estado_aprobacion === 'Rechazada' || abs.estado_aprobacion === 'Cancelada') continue;

      const absStart = new Date(abs.fecha_inicio);
      const absEnd = abs.fecha_fin_desconocida ? new Date('2099-12-31') : (abs.fecha_fin ? new Date(abs.fecha_fin) : new Date('2099-12-31'));

      // ¿La ausencia cubre el día de hoy?
      const coversToday = absStart <= todayEnd && absEnd >= todayStart;
      if (!coversToday) continue;

      const isAutoGenerated = (
        abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && abs.notas.startsWith('[shiftAudit]'))
      );

      if (isAutoGenerated) {
        // Solo guardamos la más antigua (la primera creada) para evitar duplicados
        if (!activeAutoAbsencesMap[abs.employee_id]) {
          activeAutoAbsencesMap[abs.employee_id] = abs;
        } else {
          // Si hay duplicados ya en BD, marcar las más nuevas como canceladas
          const existing = activeAutoAbsencesMap[abs.employee_id];
          const existingDate = new Date(existing.created_date || 0);
          const absDate = new Date(abs.created_date || 0);
          if (absDate < existingDate) {
            // abs es más antigua, es la que debería ser la buena
            // cancelar la que teníamos como 'existing'
            activeAutoAbsencesMap[abs.employee_id] = abs;
            svc.entities.Absence.update(existing.id, {
              estado_aprobacion: 'Cancelada',
              comentario_aprobacion: '[SISTEMA-AUTO] Duplicado cancelado en carga inicial de shiftAudit.',
            }).catch(() => {});
          } else {
            // abs es más nueva → cancelarla
            svc.entities.Absence.update(abs.id, {
              estado_aprobacion: 'Cancelada',
              comentario_aprobacion: '[SISTEMA-AUTO] Duplicado cancelado en carga inicial de shiftAudit.',
            }).catch(() => {});
          }
        }
      } else {
        // Ausencia formal (manual/RRHH)
        if (!activeFormalAbsencesMap[abs.employee_id]) {
          activeFormalAbsencesMap[abs.employee_id] = abs;
        }
      }
    }

    // Helper para escribir audit log
    const writeAuditLog = async (entry) => {
      await retryOp(() => svc.entities.AbsenceAuditLog.create({
        ...entry,
        hora_evento: systemNow,
      })).catch(e => console.warn(`[shiftAudit] Error audit log:`, e.message));
    };

    const RETRASO_MIN = 5;
    const AUSENTE_MIN = 30;

    const results = {
      presentes: 0,
      retrasos: 0,
      ausentes_auto: 0,
      ausentes_auto_ya_existian: 0,
      ausentes_formales: 0,
      reactivados: 0,
      reseteados: 0,
      sin_turno: 0,
    };

    // ========================================================================
    // MODO: CIERRE DE TURNO
    // ========================================================================
    if (mode === 'close_morning' || mode === 'close_afternoon') {
      const turnoNombre = mode === 'close_morning' ? 'Mañana' : 'Tarde';
      console.log(`[shiftAudit] CIERRE de turno ${turnoNombre}`);

      let opCount = 0;
      for (const emp of employees) {
        const shiftInfo = getEmployeeShiftInfo(emp, teamShiftMap);
        if (!shiftInfo || shiftInfo.turnoNombre !== turnoNombre) continue;
        if (emp.estado_presencia === 'No Aplica') { results.sin_turno++; continue; }

        opCount++;
        if (opCount % 3 === 0) await sleep(1000);

        await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
          estado_presencia: 'No Aplica',
          potencialmente_ausente_desde: null,
        })).catch(e => console.warn(`[shiftAudit] Error reset ${emp.nombre}:`, e.message));

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
            motivo: `Cierre de turno ${turnoNombre}. Estado anterior: ${emp.estado_presencia}.`,
            leido_por_rrhh: false,
          });
        }
        results.reseteados++;
      }

      return Response.json({ success: true, mode, turno: turnoNombre, today, reseteados: results.reseteados });
    }

    // ========================================================================
    // MODO: CHECK DE TURNO - Auditoría de presencia con IDEMPOTENCIA REAL
    // ========================================================================
    const turnoObjetivo = mode === 'check_afternoon' ? 'Tarde' : 'Mañana';
    console.log(`[shiftAudit] CHECK turno ${turnoObjetivo} | ${minutesToTime(nowMinutes)}`);

    let opCount = 0;
    for (const emp of employees) {
      const shiftInfo = getEmployeeShiftInfo(emp, teamShiftMap);

      if (!shiftInfo || shiftInfo.turnoNombre !== turnoObjetivo) {
        results.sin_turno++;
        continue;
      }

      const minutesSinceStart = nowMinutes - shiftInfo.shiftStart;

      if (minutesSinceStart < 0) {
        results.sin_turno++;
        continue;
      }

      const empCode = String(emp.codigo_empleado || '').trim();
      const hasFichado = empCode && presentToday.has(empCode);
      const absenceFormal = activeFormalAbsencesMap[emp.id];
      const absenceAuto = activeAutoAbsencesMap[emp.id]; // Ausencia auto ya existente hoy

      opCount++;
      if (opCount % 5 === 0) await sleep(600);

      // ── CASO 1: Tiene ausencia formal RRHH activa ──────────────────────
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

      // ── CASO 2: Ha fichado → Presente / Retraso / Reactivación ────────
      if (hasFichado) {
        const fichajeMinutes = firstEntryMinutes[empCode];
        const retrasoReal = fichajeMinutes !== undefined ? fichajeMinutes - shiftInfo.shiftStart : minutesSinceStart;
        const nuevoEstado = retrasoReal > RETRASO_MIN ? 'Retraso' : 'Presente';

        // Cancelar ausencia auto si existía (fichó después de ser marcado ausente)
        if (absenceAuto && ['Pendiente', 'Aprobada'].includes(absenceAuto.estado_aprobacion)) {
          await retryOp(() => svc.entities.Absence.update(absenceAuto.id, {
            fecha_fin: systemNow,
            fecha_fin_desconocida: false,
            estado_aprobacion: 'Cancelada',
            comentario_aprobacion: `[SISTEMA] Fichaje detectado a las ${minutesToTime(fichajeMinutes || nowMinutes)}. Presencia física prevalece sobre ausencia automática.`,
          })).catch(e => console.warn(`[shiftAudit] Error cancelando ausencia auto ${emp.nombre}:`, e.message));
        }

        if (['Ausente Auto', 'Ausente', 'Potencialmente Ausente', 'Retraso'].includes(emp.estado_presencia)) {
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
            absence_id: absenceAuto?.id || null,
            sync_date: today,
            turno_afectado: turnoObjetivo,
            turno_inicio_esperado: minutesToTime(shiftInfo.shiftStart),
            turno_fin_esperado: minutesToTime(shiftInfo.shiftEnd),
            origen: 'shiftAudit',
            estado_anterior: emp.estado_presencia,
            estado_nuevo: nuevoEstado,
            motivo: `Fichaje detectado a los ${Math.round(retrasoReal)} min del inicio. ${nuevoEstado === 'Retraso' ? 'Retraso registrado.' : 'Presente.'} ${absenceAuto ? 'Ausencia auto cancelada.' : ''}`,
            leido_por_rrhh: false,
          });
          results.reactivados++;
        } else if (emp.estado_presencia !== 'Presente' && emp.estado_presencia !== 'Retraso') {
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
              motivo: `Fichaje con ${Math.round(retrasoReal)} min de retraso (${minutesToTime(fichajeMinutes)}).`,
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
        // ── GUARDIA DE IDEMPOTENCIA: Verificar en BD si ya existe ausencia auto hoy ──
        // Esto es la clave: usamos activeAutoAbsencesMap que fue cargado al inicio
        // y representa el estado REAL de la BD, no el cache del empleado.
        if (absenceAuto) {
          // Ya existe ausencia auto en BD → NO crear otra. Solo actualizar estado si necesario.
          if (emp.estado_presencia !== 'Ausente Auto' && emp.estado_presencia !== 'Ausente') {
            await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
              disponibilidad: 'Ausente',
              estado_presencia: 'Ausente Auto',
              ausencia_motivo: `Ausencia no comunicada - turno ${turnoObjetivo}`,
            })).catch(e => console.warn(`[shiftAudit] Error sync estado ${emp.nombre}:`, e.message));
          }
          results.ausentes_auto_ya_existian++;
          continue;
        }

        // No existe ausencia auto hoy → crear (primera y única vez)
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
          notas: `[shiftAudit] Turno ${turnoObjetivo} (${minutesToTime(shiftInfo.shiftStart)}-${minutesToTime(shiftInfo.shiftEnd)}). Sin fichaje a los ${Math.round(minutesSinceStart)} min. Fecha: ${systemNow}. PENDIENTE REVISIÓN RRHH - NO impacta en nómina sin aprobación.`,
        })).catch(e => { console.warn(`[shiftAudit] Error creando ausencia ${emp.nombre}:`, e.message); return null; });

        if (newAbsence) {
          // Registrar en mapa para evitar duplicados en iteraciones posteriores del mismo lote
          activeAutoAbsencesMap[emp.id] = newAbsence;
        }

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
          motivo: `Sin fichaje ${Math.round(minutesSinceStart)} min tras inicio turno ${turnoObjetivo}. Ausencia automática creada. PENDIENTE REVISIÓN RRHH.`,
          leido_por_rrhh: false,
        });
        results.ausentes_auto++;

      } else if (minutesSinceStart >= RETRASO_MIN) {
        // 5-29 min → Potencialmente Ausente (NO crear Absence todavía)
        if (!['Potencialmente Ausente', 'Ausente Auto', 'Ausente'].includes(emp.estado_presencia)) {
          await retryOp(() => svc.entities.EmployeeMasterDatabase.update(emp.id, {
            estado_presencia: 'Potencialmente Ausente',
            potencialmente_ausente_desde: systemNow,
          })).catch(e => console.warn(`[shiftAudit] Error pot.ausente ${emp.nombre}:`, e.message));
        }
      }
      // < RETRASO_MIN → no hacer nada, turno recién empezado
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