import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de tiempo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la hora actual en España (Europe/Madrid) como minutos desde medianoche.
 * Usa el offset dinámico: UTC+2 en verano (CEST), UTC+1 en invierno (CET).
 */
function getNowSpainMinutes() {
  const now = new Date();
  // Usamos toLocaleString para obtener la hora real en Spain (respeta DST automáticamente)
  const localStr = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid', hour12: false, hour: '2-digit', minute: '2-digit' });
  const [h, m] = localStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Devuelve la hora actual en Spain como objeto Date ajustado.
 */
function getNowSpain() {
  const now = new Date();
  const localStr = now.toLocaleString('en-CA', { timeZone: 'Europe/Madrid', hour12: false });
  return new Date(localStr.replace(',', ''));
}

/**
 * Convierte "HH:mm" a minutos desde medianoche.
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Dado un empleado y su turno asignado para HOY, devuelve el objeto de horario:
 * { shiftStart, shiftEnd } en minutos, o null si no aplica turno hoy.
 * 
 * assignedShift: 'Mañana' | 'Tarde' | null (para turno partido / sin turno)
 */
function getEmployeeShiftToday(emp, assignedShift) {
  const nowMinutes = getNowSpainMinutes();

  if (emp.tipo_turno === 'Turno Partido') {
    // Para turno partido consideramos la franja que esté activa ahora o la próxima
    const e1 = timeToMinutes(emp.turno_partido_entrada1);
    const s1 = timeToMinutes(emp.turno_partido_salida1);
    const e2 = timeToMinutes(emp.turno_partido_entrada2);
    const s2 = timeToMinutes(emp.turno_partido_salida2);
    // Buscar la primera franja del día
    if (e1 !== null) return { shiftStart: e1, shiftEnd: s1 };
    return null;
  }

  if (assignedShift === 'Mañana') {
    const start = timeToMinutes(emp.horario_manana_inicio);
    const end = timeToMinutes(emp.horario_manana_fin);
    if (start === null) return null;
    return { shiftStart: start, shiftEnd: end };
  }

  if (assignedShift === 'Tarde') {
    const start = timeToMinutes(emp.horario_tarde_inicio);
    const end = timeToMinutes(emp.horario_tarde_fin);
    if (start === null) return null;
    return { shiftStart: start, shiftEnd: end };
  }

  // Sin turno asignado claro → intentamos inferir por hora actual
  const mStart = timeToMinutes(emp.horario_manana_inicio);
  const tStart = timeToMinutes(emp.horario_tarde_inicio);
  
  // Tomamos el turno cuyo inicio sea más próximo (ya pasado o futuro cercano)
  if (mStart !== null && tStart !== null) {
    // El que ha comenzado más recientemente
    const mDiff = nowMinutes - mStart;
    const tDiff = nowMinutes - tStart;
    if (mDiff >= 0 && (tDiff < 0 || mDiff < tDiff)) {
      return { shiftStart: mStart, shiftEnd: timeToMinutes(emp.horario_manana_fin) };
    }
    if (tDiff >= 0) {
      return { shiftStart: tStart, shiftEnd: timeToMinutes(emp.horario_tarde_fin) };
    }
    // Ninguno ha empezado aún → el que empieza antes
    return mStart < tStart
      ? { shiftStart: mStart, shiftEnd: timeToMinutes(emp.horario_manana_fin) }
      : { shiftStart: tStart, shiftEnd: timeToMinutes(emp.horario_tarde_fin) };
  }
  if (mStart !== null) return { shiftStart: mStart, shiftEnd: timeToMinutes(emp.horario_manana_fin) };
  if (tStart !== null) return { shiftStart: tStart, shiftEnd: timeToMinutes(emp.horario_tarde_fin) };

  return null;
}

/**
 * Devuelve el número de semana ISO para una fecha
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Formatea minutos como "HH:mm"
 */
function minutesToTime(minutes) {
  if (minutes === null || minutes === undefined) return '00:00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOp(fn, retries = 3, baseDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isRate = e?.message?.includes('Rate limit') || e?.message?.includes('429');
      if (isRate && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`[cucoSyncV2] Rate limit, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
}

/**
 * Elimina registros de un día filtrando por import_batch para evitar borrar todos los registros
 * uno a uno. Usa chunks de 20 con pausa de 1s entre lotes para respetar el rate limit.
 */
async function fastDeleteByDate(serviceClient, dateStr) {
  let totalDeleted = 0;
  const MAX_LOOPS = 20;
  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    const page = await retryOp(() =>
      serviceClient.entities.AttendanceRecord.filter({ record_date: dateStr }, "id", 50)
    );
    if (!page || page.length === 0) break;
    // Delete in chunks of 5 with 1.5s pause between chunks
    const CHUNK = 5;
    for (let i = 0; i < page.length; i += CHUNK) {
      const chunk = page.slice(i, i + CHUNK);
      await Promise.allSettled(chunk.map(r => serviceClient.entities.AttendanceRecord.delete(r.id)));
      totalDeleted += chunk.length;
      await sleep(1500);
    }
    if (page.length < 50) break;
    await sleep(1000);
  }
  return totalDeleted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceClient = base44.asServiceRole;

    // Auth: allow admin users or scheduled calls (no user token)
    let user = null;
    try { user = await base44.auth.me().catch(() => null); } catch (_) {}
    const userRole = (user?.role || '').toLowerCase();
    if (user && user.email && userRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { date, start_date, end_date, force, debug_mode, skip_analysis } = body;

    if (debug_mode) {
      const nowMin = getNowSpainMinutes();
      return Response.json({
        success: true,
        message: "Function cucoSyncV2 is deployed and reachable.",
        has_key: !!Deno.env.get("CUCO360_API_KEY"),
        spain_time_minutes: nowMin,
        spain_time_formatted: minutesToTime(nowMin)
      });
    }

    const apiKey = Deno.env.get("CUCO360_API_KEY");
    if (!apiKey) throw new Error("Secret 'CUCO360_API_KEY' is not configured.");

    const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";
    const authHeader = apiKey.replace("Bearer ", "").trim();

    let from = start_date;
    let to = end_date;
    if (date) { from = date; to = date; }
    if (!from || !to) {
      const today = new Date().toISOString().split('T')[0];
      from = today; to = today;
    }

    // Saltar fines de semana solo cuando es un único día y no forzado
    if (!force && from === to) {
      const targetDate = new Date(from + 'T12:00:00Z');
      const dayOfWeek = targetDate.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return Response.json({ success: true, message: "Skipped: Weekend", count: 0 });
      }
      const holidays = await serviceClient.entities.Holiday.filter({ date: from }, "id", 1);
      if (holidays && holidays.length > 0) {
        return Response.json({ success: true, message: `Skipped: Holiday (${holidays[0].name})`, count: 0 });
      }
    }

    console.log(`[cucoSyncV2] Syncing ${CLIENT_CODE} from ${from} to ${to}`);
    console.log(`[cucoSyncV2] Hora Spain actual: ${minutesToTime(getNowSpainMinutes())}`);

    // ── 1. Obtener marcajes de Cuco360 ──────────────────────────────────────
    const startEnc = encodeURIComponent(`${from} 00:00:00`);
    const endEnc = encodeURIComponent(`${to} 23:59:59`);
    const url = `https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/${CLIENT_CODE}?start_date=${startEnc}&end_date=${endEnc}`;

    // Fetch con reintentos ante Cloudflare 429/503
    let response = null;
    let lastCucoError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const delay = 3000 * attempt; // 3s, 6s
        console.log(`[cucoSyncV2] Reintento ${attempt} tras error Cuco360, esperando ${delay}ms...`);
        await sleep(delay);
      }
      try {
        response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            "accept": "application/json",
            "APIkey": authHeader,
            "X-CSRF-TOKEN": ""
          }
        });

        if (response.status === 429 || response.status === 503) {
          lastCucoError = `Cuco360 devolvió ${response.status} (demasiadas peticiones). Reintentando...`;
          console.warn(`[cucoSyncV2] ${lastCucoError}`);
          response = null;
          continue;
        }

        if (response.status === 403) {
          const text = await response.text();
          // Cloudflare challenge — no es un error de auth de la API
          if (text.includes('cloudflare') || text.includes('Just a moment') || text.includes('challenge')) {
            lastCucoError = `Cuco360 bloqueado temporalmente por Cloudflare (protección anti-bot). Espera unos minutos e inténtalo de nuevo.`;
            console.error(`[cucoSyncV2] Cloudflare challenge detectado en intento ${attempt}`);
            response = null;
            await sleep(5000); // Esperar más antes de reintentar
            continue;
          }
          throw new Error(`CUCO360 API Error (403): Acceso denegado. Verifica la API key.`);
        }

        break; // Respuesta válida
      } catch (fetchErr) {
        lastCucoError = fetchErr.message;
        if (attempt === 2) throw fetchErr;
      }
    }

    if (!response) {
      return Response.json({
        success: false,
        error: lastCucoError || "Cuco360 no disponible tras 3 intentos",
        retry_suggested: true
      }, { status: 503 });
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CUCO360 API Error (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = await response.json();
    if (json.success === false) {
      throw new Error(`CUCO360 error: ${json.message || JSON.stringify(json)}`);
    }

    const checks = json.checks || json.data || json;
    if (!Array.isArray(checks)) {
      return Response.json({ success: true, message: "No data from CUCO360 (empty checks)", count: 0 });
    }

    // ── 2. Cargar base maestra de empleados ─────────────────────────────────
    const masterEmployees = await retryOp(() =>
      serviceClient.entities.EmployeeMasterDatabase.list(undefined, 2000)
    );

    const masterMapByCodigo = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) {
        masterMapByCodigo[String(emp.codigo_empleado).trim()] = emp;
      }
    }

    // ── 3. Procesar registros de marcaje ────────────────────────────────────
    // El batch incluye la fecha del día para poder identificar y limpiar re-syncs del mismo día
    const todayBatch = `cuco_v2_sync_${from}`;

    const recordsToCreate = checks.map((check) => {
      const externalId = String(check.cod_int_empleado || check.cod_interno || check.cod_empleado || "").trim();
      const fullDate = check.fec_marcaje || check.fecha;
      if (!externalId || !fullDate) return null;

      // Filtrar marcajes sintéticos/automáticos de Cuco360 (cod_marcaje negativo)
      if (check.cod_marcaje !== undefined && Number(check.cod_marcaje) < 0) return null;

      const dateParts = fullDate.split(' ');
      const dateStr = dateParts[0];
      const timeStr = (dateParts[1] || '00:00').slice(0, 5);

      const masterEmp = masterMapByCodigo[externalId];

      const type = String(check.val_direccion || "").toUpperCase();
      const direction = (type === "S" || type === "SALIDA" || type === "OUT" || type === "2") ? "S" : "E";

      return {
        employee_id: externalId,
        employee_name: masterEmp?.nombre || check.nombre || `Empleado ${externalId}`,
        department: masterEmp?.departamento || "Producción",
        record_date: dateStr,
        record_time: timeStr,
        direction,
        device: check.nom_dispositivo || "API CUCO360",
        import_batch: todayBatch
      };
    }).filter(r => r !== null);

    console.log(`[cucoSyncV2] ${recordsToCreate.length} registros obtenidos de Cuco360`);

    // ── 4. Limpiar registros previos del mismo import_batch (solo re-sync) ─
    // Para sync manual: borramos solo registros con import_batch que empiece por "cuco_v2_sync_"
    // del mismo día para evitar duplicados. Máx 50 registros por día para no hacer timeout.
    const uniqueDates = [...new Set(recordsToCreate.map(r => r.record_date))];
    console.log(`[cucoSyncV2] Verificando registros previos en ${uniqueDates.length} día(s)...`);

    for (const d of uniqueDates) {
      const prevBatch = `cuco_v2_sync_${d}`;
      const existing = await retryOp(() =>
        serviceClient.entities.AttendanceRecord.filter({ record_date: d, import_batch: prevBatch }, "id", 200)
      ).catch(() => []);
      if (existing && existing.length > 0) {
        const CHUNK = 10;
        for (let i = 0; i < existing.length; i += CHUNK) {
          const chunk = existing.slice(i, i + CHUNK);
          await Promise.allSettled(chunk.map(r => serviceClient.entities.AttendanceRecord.delete(r.id)));
          await sleep(800);
        }
        console.log(`[cucoSyncV2] Día ${d}: ${existing.length} registros del batch previo eliminados`);
      }
    }

    // ── 5. Insertar nuevos registros en chunks ────────────────────────────
    const BULK = 100;
    let inserted = 0;
    for (let i = 0; i < recordsToCreate.length; i += BULK) {
      const chunk = recordsToCreate.slice(i, i + BULK);
      await retryOp(() => serviceClient.entities.AttendanceRecord.bulkCreate(chunk));
      inserted += chunk.length;
      if (i % 300 === 0) console.log(`[cucoSyncV2] Insertados ${inserted}/${recordsToCreate.length}`);
      await sleep(200);
    }

    // ── 6. Análisis de presencia (solo si no se omite explícitamente) ─
    if (from === to && !skip_analysis) {
      const syncDate = from;
      const nowSpain = getNowSpain();
      const nowMinutes = getNowSpainMinutes();
      const systemNow = new Date().toISOString();

      // Cargar calendario de rotación semanal para la semana actual
      const currentWeek = getISOWeek(nowSpain);
      const currentYear = nowSpain.getFullYear();
      // Obtener lunes de esta semana para filtrar TeamWeekSchedule por fecha_inicio_semana
      const mondayOfWeek = (() => {
        const d = new Date(nowSpain);
        const day = d.getDay();
        const diff = (day === 0) ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d.toISOString().split('T')[0];
      })();
      const weekSchedules = await retryOp(() =>
        serviceClient.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: mondayOfWeek })
      ).catch(() => []);

      // teamShiftMap: team_key → 'Mañana' | 'Tarde'
      const teamShiftMap = {};
      for (const ws of weekSchedules) {
        if (ws.team_key && ws.turno) teamShiftMap[ws.team_key] = ws.turno; // campo correcto: turno
      }
      console.log(`[cucoSyncV2] Turnos semana ${currentWeek}/${currentYear}:`, JSON.stringify(teamShiftMap));

      // Cargar ausencias activas para cruzar con empleados
      const allAbsences = await retryOp(() =>
        serviceClient.entities.Absence.list("-fecha_inicio", 2000)
      );

      const syncDateObj = new Date(syncDate + "T12:00:00Z");
      const activeAbsencesToday = allAbsences.filter(abs => {
        if (abs.estado_aprobacion === "Rechazada" || abs.estado_aprobacion === "Cancelada") return false;
        const start = new Date(abs.fecha_inicio);
        const end = abs.fecha_fin_desconocida ? new Date("2099-12-31") : new Date(abs.fecha_fin);
        return start <= syncDateObj && syncDateObj <= end;
      });

      const absenceByEmployee = {};
      for (const abs of activeAbsencesToday) {
        if (!absenceByEmployee[abs.employee_id]) {
          absenceByEmployee[abs.employee_id] = abs;
        }
      }

      const controlledEmployees = masterEmployees.filter(emp =>
        emp.estado_empleado === "Alta" &&
        emp.sujeto_a_control_horario !== false
      );

      // Set de empleados que ficharon HOY (entrada)
      const ficharonHoy = new Set(
        recordsToCreate.filter(r => r.direction === 'E').map(r => r.employee_id)
      );

      const reactivados = [];
      const confirmados = [];
      const nuevosRetrasos = [];
      const nuevasAusencias = [];

      // UMBRALES
      const RETRASO_MIN = 5;   // minutos tras inicio de turno → retraso
      const AUSENCIA_MIN = 20; // minutos tras inicio de turno → ausencia automática

      for (const emp of controlledEmployees) {
        const code = String(emp.codigo_empleado || "").trim();
        if (!code) continue;
        const hasFichado = ficharonHoy.has(code);
        const absenceRecord = absenceByEmployee[emp.id];

        // Determinar turno asignado esta semana
        let assignedShift = null;
        if (emp.tipo_turno === 'Rotativo' && emp.team_key) {
          assignedShift = teamShiftMap[emp.team_key] || null;
        } else if (emp.tipo_turno === 'Fijo Mañana') {
          assignedShift = 'Mañana';
        } else if (emp.tipo_turno === 'Fijo Tarde') {
          assignedShift = 'Tarde';
        }

        // Obtener el horario de turno del empleado para hoy
        const shiftInfo = getEmployeeShiftToday(emp, assignedShift);

        if (hasFichado) {
          // PRESENCIA DETECTADA: si estaba como ausente o retraso → reactivar
          if (emp.disponibilidad === "Ausente" || emp.estado_presencia === "Retraso" || emp.estado_presencia === "Ausente Auto") {
            reactivados.push({ emp, absence: absenceRecord });
          }
        } else {
          // SIN FICHAJE
          if (absenceRecord) {
            // Ausencia pre-configurada → confirmar
            confirmados.push({ emp, absence: absenceRecord });
          } else if (shiftInfo !== null) {
            const minutesSinceStart = nowMinutes - shiftInfo.shiftStart;

            if (minutesSinceStart >= AUSENCIA_MIN && emp.estado_presencia !== "Ausente Auto" && emp.disponibilidad !== "Ausente") {
              // ≥20 min sin fichar → ausencia automática
              nuevasAusencias.push({ emp, shiftInfo });
            } else if (minutesSinceStart >= RETRASO_MIN && minutesSinceStart < AUSENCIA_MIN && emp.estado_presencia !== "Retraso" && emp.estado_presencia !== "Ausente Auto" && emp.disponibilidad !== "Ausente") {
              // 5-19 min sin fichar → retraso
              nuevosRetrasos.push({ emp, shiftInfo });
            }
          }
        }
      }

      // Helper: escribir audit log
      const writeAuditLog = async (entry) => {
        await retryOp(() => serviceClient.entities.AbsenceAuditLog.create(entry))
          .catch(e => console.warn(`[cucoSyncV2] Error audit log:`, e));
      };

      // ── Reactivar: presencia física prevalece ────────────────────────────
      for (const { emp, absence } of reactivados) {
        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Disponible",
          estado_presencia: "Presente",
          ausencia_fin: systemNow,
          ausencia_motivo: null,
          potencialmente_ausente_desde: null
        })).catch(e => console.warn(`[cucoSyncV2] Error reactivando ${emp.nombre}:`, e));

        if (absence && (emp.disponibilidad === "Ausente" || emp.estado_presencia === "Ausente Auto")) {
          await retryOp(() => serviceClient.entities.Absence.update(absence.id, {
            fecha_fin: systemNow,
            fecha_fin_desconocida: false,
            estado_aprobacion: "Cancelada",
            comentario_aprobacion: `[SISTEMA] Cerrada automáticamente el ${syncDate}: fichaje detectado. La presencia física prevalece.`
          })).catch(e => console.warn(`[cucoSyncV2] Error cerrando ausencia ${emp.nombre}:`, e));
        }

        await writeAuditLog({
          employee_id: emp.id,
          employee_name: emp.nombre,
          employee_dept: emp.departamento || "",
          action_type: "reactivacion_por_presencia",
          absence_id: absence?.id || null,
          sync_date: syncDate,
          origen: "cucoSyncV2",
          estado_anterior: emp.estado_presencia || emp.disponibilidad,
          estado_nuevo: "Presente",
          motivo: `Fichaje de entrada detectado. ${absence ? `Ausencia previa cerrada automáticamente.` : ""}`,
          leido_por_rrhh: false,
          notas: `[SISTEMA] Reactivación - sync ${systemNow}`
        });
        console.log(`[cucoSyncV2] ✅ REACTIVADO: ${emp.nombre}`);
      }

      // ── Confirmar ausencias pre-configuradas ─────────────────────────────
      for (const { emp, absence } of confirmados) {
        if (emp.disponibilidad !== "Ausente") {
          await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: "Ausente",
            estado_presencia: "Ausente",
            ausencia_inicio: absence.fecha_inicio,
            ausencia_fin: absence.fecha_fin_desconocida ? null : absence.fecha_fin,
            ausencia_motivo: `${absence.tipo || absence.motivo} (ausencia configurada)`
          })).catch(e => console.warn(`[cucoSyncV2] Error confirmando ${emp.nombre}:`, e));

          await writeAuditLog({
            employee_id: emp.id,
            employee_name: emp.nombre,
            employee_dept: emp.departamento || "",
            action_type: "ausencia_confirmada",
            absence_id: absence.id,
            sync_date: syncDate,
            origen: "cucoSyncV2",
            estado_anterior: emp.disponibilidad || "Disponible",
            estado_nuevo: "Ausente",
            motivo: `${absence.tipo || absence.motivo} - sin fichaje confirma ausencia pre-configurada`,
            leido_por_rrhh: false,
            notas: `[SISTEMA] Confirmación - sync ${systemNow}`
          });
        }
        console.log(`[cucoSyncV2] 🔵 CONFIRMADA: ${emp.nombre} - ${absence.tipo || absence.motivo}`);
      }

      // ── Marcar como RETRASO (5-19 min sin fichar) ────────────────────────
      for (const { emp, shiftInfo } of nuevosRetrasos) {
        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          estado_presencia: "Retraso",
          potencialmente_ausente_desde: systemNow
        })).catch(e => console.warn(`[cucoSyncV2] Error marcando retraso ${emp.nombre}:`, e));

        await writeAuditLog({
          employee_id: emp.id,
          employee_name: emp.nombre,
          employee_dept: emp.departamento || "",
          action_type: "ausencia_confirmada",
          absence_id: null,
          sync_date: syncDate,
          origen: "cucoSyncV2",
          estado_anterior: emp.estado_presencia || "Presente",
          estado_nuevo: "Retraso",
          motivo: `Retraso detectado: turno ${minutesToTime(shiftInfo.shiftStart)} — sin fichaje a las ${minutesToTime(nowMinutes)}`,
          leido_por_rrhh: false,
          notas: `[SISTEMA] Retraso detectado - sync ${systemNow}`
        });
        console.log(`[cucoSyncV2] ⚠️ RETRASO: ${emp.nombre} (turno ${minutesToTime(shiftInfo.shiftStart)})`);
      }

      // ── Nuevas ausencias automáticas (≥20 min sin fichar) ────────────────
      for (const { emp, shiftInfo } of nuevasAusencias) {
        // Calcular horas reales del turno (no 00:00-23:59)
        const absenceStart = `${syncDate}T${minutesToTime(shiftInfo.shiftStart)}:00`;
        const absenceEnd = shiftInfo.shiftEnd !== null
          ? `${syncDate}T${minutesToTime(shiftInfo.shiftEnd)}:00`
          : `${syncDate}T${minutesToTime(shiftInfo.shiftStart + 480)}:00`; // fallback: +8h

        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Ausente",
          estado_presencia: "Ausente Auto",
          ausencia_inicio: absenceStart,
          ausencia_motivo: "Ausencia no comunicada - detección automática",
          potencialmente_ausente_desde: systemNow
        })).catch(e => console.warn(`[cucoSyncV2] Error marcando ausente ${emp.nombre}:`, e));

        let newAbsenceId = null;
        const created = await retryOp(() => serviceClient.entities.Absence.create({
          employee_id: emp.id,
          fecha_inicio: absenceStart,
          fecha_fin: absenceEnd,
          fecha_fin_desconocida: true, // Se mantendrá activa hasta que fiche
          motivo: "Ausencia no comunicada - detección automática",
          tipo: "Ausencia No Justificada",
          estado_aprobacion: "Pendiente",
          remunerada: false,
          notas: `[SISTEMA] Ausencia auto por cucoSyncV2 el ${systemNow}. Turno esperado: ${minutesToTime(shiftInfo.shiftStart)}-${minutesToTime(shiftInfo.shiftEnd)}. Sin fichaje detectado en Cuco360.`
        })).catch(e => { console.warn(`[cucoSyncV2] Error creando ausencia ${emp.nombre}:`, e); return null; });

        if (created) newAbsenceId = created.id;

        await writeAuditLog({
          employee_id: emp.id,
          employee_name: emp.nombre,
          employee_dept: emp.departamento || "",
          action_type: "ausencia_auto_creada",
          absence_id: newAbsenceId,
          sync_date: syncDate,
          origen: "cucoSyncV2",
          estado_anterior: emp.estado_presencia || "Disponible",
          estado_nuevo: "Ausente Auto",
          motivo: `Sin fichaje ${minutesToTime(nowMinutes)}. Turno esperado: ${minutesToTime(shiftInfo.shiftStart)}-${minutesToTime(shiftInfo.shiftEnd)}. Ausencia No Justificada generada automáticamente.`,
          leido_por_rrhh: false,
          notas: `[SISTEMA] Creación automática - sync ${systemNow}`
        });
        console.log(`[cucoSyncV2] 🔴 AUSENCIA AUTO: ${emp.nombre} (turno ${minutesToTime(shiftInfo.shiftStart)}-${minutesToTime(shiftInfo.shiftEnd)})`);
      }

      const summary = {
        employees_controlled: controlledEmployees.length,
        ficharon: ficharonHoy.size,
        reactivados: reactivados.length,
        ausencias_confirmadas: confirmados.length,
        nuevos_retrasos: nuevosRetrasos.length,
        nuevas_ausencias_auto: nuevasAusencias.length,
        hora_spain: minutesToTime(nowMinutes),
        semana_iso: currentWeek,
        turnos_equipo: teamShiftMap
      };
      console.log(`[cucoSyncV2] Resumen: ${JSON.stringify(summary)}`);

      return Response.json({
        success: true,
        message: `Sync OK: ${inserted} fichajes. Reactivados: ${reactivados.length}, Confirmadas: ${confirmados.length}, Retrasos: ${nuevosRetrasos.length}, Ausencias auto: ${nuevasAusencias.length}`,
        count: inserted,
        analysis: summary
      });
    }

    return Response.json({
      success: true,
      message: `Synced ${inserted} records from CUCO360 (${uniqueDates.length} días)`,
      count: inserted,
      days: uniqueDates.length
    });

  } catch (err) {
    console.error("[cucoSyncV2] Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});