import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { sleep, parseCheckDirection, extractTimeStr, extractDateStr, getCheckEmployeeCode } from '../../shared/cuco360Utils.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de tiempo
// ─────────────────────────────────────────────────────────────────────────────

function getNowSpainMinutes() {
  const now = new Date();
  const localStr = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid', hour12: false, hour: '2-digit', minute: '2-digit' });
  const [h, m] = localStr.split(':').map(Number);
  return h * 60 + m;
}

function getNowSpain() {
  const now = new Date();
  const localStr = now.toLocaleString('en-CA', { timeZone: 'Europe/Madrid', hour12: false });
  return new Date(localStr.replace(',', ''));
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(minutes) {
  if (minutes === null || minutes === undefined) return '00:00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getEmployeeShiftToday(emp, assignedShift) {
  if (emp.tipo_turno === 'Turno Partido') {
    const e1 = timeToMinutes(emp.turno_partido_entrada1);
    const s1 = timeToMinutes(emp.turno_partido_salida1);
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
  // Sin turno asignado conocido → no asumir ninguno para evitar falsos positivos
  // (especialmente en empleados Rotativos sin team_key configurado)
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cumplimiento horario: calcula retraso, salida anticipada y horas no trabajadas
// ─────────────────────────────────────────────────────────────────────────────

function getEmployeeShiftSpan(emp, assignedShift) {
  if (emp.tipo_turno === 'Turno Partido') {
    const e1 = timeToMinutes(emp.turno_partido_entrada1);
    const s1 = timeToMinutes(emp.turno_partido_salida1);
    const e2 = timeToMinutes(emp.turno_partido_entrada2);
    const s2 = timeToMinutes(emp.turno_partido_salida2);
    if (e1 === null) return null;
    const expectedMinutes = (s1 !== null && e2 !== null && s2 !== null)
      ? (s1 - e1) + (s2 - e2)
      : (s1 !== null ? s1 - e1 : 0);
    return {
      shiftStart: e1,
      shiftEnd: s2 !== null ? s2 : (s1 !== null ? s1 : null),
      expectedMinutes
    };
  }
  if (assignedShift === 'Mañana') {
    const start = timeToMinutes(emp.horario_manana_inicio);
    const end = timeToMinutes(emp.horario_manana_fin);
    if (start === null) return null;
    return {
      shiftStart: start,
      shiftEnd: end,
      expectedMinutes: end !== null ? end - start : (emp.num_horas_jornada || 8) * 60
    };
  }
  if (assignedShift === 'Tarde') {
    const start = timeToMinutes(emp.horario_tarde_inicio);
    const end = timeToMinutes(emp.horario_tarde_fin);
    if (start === null) return null;
    return {
      shiftStart: start,
      shiftEnd: end,
      expectedMinutes: end !== null ? end - start : (emp.num_horas_jornada || 8) * 60
    };
  }
  return null;
}

function calculateCompliance(emp, assignedShift, firstEntry, lastExit, isPastDate) {
  if (!emp) {
    return {
      expected_start: null, expected_end: null,
      minutes_late: 0, minutes_early: 0,
      expected_minutes: 0, actual_minutes: 0, missing_minutes: 0,
      compliance_status: 'Sin Datos',
    };
  }

  const span = getEmployeeShiftSpan(emp, assignedShift);

  if (!span) {
    const actualMin = firstEntry && lastExit ? Math.max(0, timeToMinutes(lastExit) - timeToMinutes(firstEntry)) : 0;
    return {
      expected_start: null, expected_end: null,
      minutes_late: 0, minutes_early: 0,
      expected_minutes: 0, actual_minutes: actualMin,
      missing_minutes: 0, compliance_status: 'Sin Turno',
    };
  }

  if (!firstEntry) {
    return {
      expected_start: minutesToTime(span.shiftStart),
      expected_end: span.shiftEnd !== null ? minutesToTime(span.shiftEnd) : null,
      minutes_late: 0, minutes_early: 0,
      expected_minutes: span.expectedMinutes,
      actual_minutes: 0, missing_minutes: span.expectedMinutes,
      compliance_status: 'Ausente',
    };
  }

  const entryMin = timeToMinutes(firstEntry);
  const exitMin = lastExit ? timeToMinutes(lastExit) : null;

  const minutesLate = Math.max(0, entryMin - span.shiftStart);
  const minutesEarly = (exitMin !== null && span.shiftEnd !== null) ? Math.max(0, span.shiftEnd - exitMin) : 0;
  const actualMinutes = exitMin !== null ? Math.max(0, exitMin - entryMin) : 0;
  // Horas no trabajadas: solo si las horas reales NO cubren la jornada esperada
  const missingMinutes = Math.max(0, span.expectedMinutes - actualMinutes);

  const TOLERANCE_MIN = 5;
  let status = 'Completa';
  if (exitMin === null) {
    status = isPastDate ? 'Sin Salida' : (minutesLate > TOLERANCE_MIN ? 'Retraso' : 'En Curso');
  } else if (actualMinutes >= span.expectedMinutes - TOLERANCE_MIN) {
    // Jornada cubierta: aunque los horarios no coincidan con los esperados, no hay horas no trabajadas
    status = 'Completa';
  } else if (minutesLate > TOLERANCE_MIN && minutesEarly > TOLERANCE_MIN) {
    status = 'Incompleta';
  } else if (minutesLate > TOLERANCE_MIN) {
    status = 'Retraso';
  } else if (minutesEarly > TOLERANCE_MIN) {
    status = 'Salida Anticipada';
  }

  return {
    expected_start: minutesToTime(span.shiftStart),
    expected_end: span.shiftEnd !== null ? minutesToTime(span.shiftEnd) : null,
    minutes_late: minutesLate,
    minutes_early: minutesEarly,
    expected_minutes: span.expectedMinutes,
    actual_minutes: actualMinutes,
    missing_minutes: missingMinutes,
    compliance_status: status,
  };
}

// sleep importado de shared/cuco360Utils.ts

async function retryOp(fn, retries = 4, baseDelay = 800) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isRate = e?.message?.includes('Rate limit') || e?.message?.includes('429');
      if (i < retries - 1) {
        const delay = isRate ? baseDelay * Math.pow(2, i) : baseDelay;
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync atómico por empleado: borra y reinserta solo los registros de UN empleado
// para un día. Devuelve { success, deleted, inserted, error? }
// ─────────────────────────────────────────────────────────────────────────────
async function syncEmployeeRecords(serviceClient, employeeCode, dateStr, records, batchId) {
  const result = { success: false, deleted: 0, inserted: 0, skipped: 0, error: null };

  try {
    // 1. Obtener registros existentes de este empleado para este día
    const existing = await retryOp(() =>
      serviceClient.entities.AttendanceRecord.filter(
        { record_date: dateStr, employee_id: employeeCode }, "record_time", 200
      ), 5, 1200
    );

    // Construir set de claves ya existentes (employee_id + record_time + direction)
    const existingKeys = new Set();
    for (const r of (existing || [])) {
      existingKeys.add(`${r.record_time}_${r.direction}`);
    }

    // 2. Solo insertar registros NUEVOS (que no existen todavía)
    const toInsert = records.filter(r => !existingKeys.has(`${r.record_time}_${r.direction}`));
    result.skipped = records.length - toInsert.length;

    if (toInsert.length > 0) {
      await retryOp(() => serviceClient.entities.AttendanceRecord.bulkCreate(toInsert), 5, 1200);
      result.inserted = toInsert.length;
    }

    result.success = true;

  } catch (err) {
    result.error = err.message;
    result.success = false;
    console.error(`[cucoSyncV2] ❌ ERROR sync empleado ${employeeCode}: ${err.message}`);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Procesar lote de empleados en PARALELO (hasta BATCH_SIZE simultáneos)
// existingKeysMap: mapa precargado { "empId_date": Set<"time_dir"> }
// ─────────────────────────────────────────────────────────────────────────────
async function processBatch(serviceClient, batch, recordsByEmployee, todayBatch, existingKeysMap) {
  return await Promise.allSettled(
    batch.map(async (code) => {
      const dateMap = recordsByEmployee[code];
      const results = {};
      for (const [dateStr, records] of Object.entries(dateMap)) {
        results[dateStr] = await syncEmployeeRecordsWithCache(serviceClient, code, dateStr, records, todayBatch, existingKeysMap);
      }
      const allOk = Object.values(results).every(r => r.success);
      return { code, results, success: allOk };
    })
  );
}

// Versión con caché precargado — no hace query por empleado, usa existingKeysMap
async function syncEmployeeRecordsWithCache(serviceClient, employeeCode, dateStr, records, batchId, existingKeysMap) {
  const result = { success: false, deleted: 0, inserted: 0, skipped: 0, error: null };
  try {
    const cacheKey = `${employeeCode}_${dateStr}`;
    const existingKeys = existingKeysMap[cacheKey] || new Set();

    const toInsert = records.filter(r => !existingKeys.has(`${r.record_time}_${r.direction}`));
    result.skipped = records.length - toInsert.length;

    if (toInsert.length > 0) {
      await retryOp(() => serviceClient.entities.AttendanceRecord.bulkCreate(toInsert), 5, 1200);
      result.inserted = toInsert.length;
    }
    result.success = true;
  } catch (err) {
    result.error = err.message;
    result.success = false;
    console.error(`[cucoSyncV2] ❌ ERROR sync empleado ${employeeCode}: ${err.message}`);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const serviceClient = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { date, start_date, end_date, force, debug_mode, skip_analysis } = body;

    // Auth: require admin user, valid scheduler secret, or internal frontend call (auth header)
    const SCHEDULER_SECRET = 'b44_cde_sched_7f3a9b2e8c1d4a6f5b7c9e1d3a2b4c6';
    const isSchedulerCall = body._scheduler_secret === SCHEDULER_SECRET;
    const hasAuthHeader = !!req.headers.get('authorization');
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user && !isSchedulerCall && !hasAuthHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user && user.role?.toLowerCase() !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

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

    // Saltar fines de semana / festivos (solo sync de un día no forzado)
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

    console.log(`[cucoSyncV2] ═══ INICIO SYNC ${from}→${to} ═══`);
    console.log(`[cucoSyncV2] Hora Spain: ${minutesToTime(getNowSpainMinutes())}`);

    // ── PASO 1: Obtener marcajes de Cuco360 ───────────────────────────────
    const startEnc = encodeURIComponent(`${from} 00:00:00`);
    const endEnc = encodeURIComponent(`${to} 23:59:59`);
    const url = `https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/${CLIENT_CODE}?start_date=${startEnc}&end_date=${endEnc}`;

    let response = null;
    let lastCucoError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await sleep(3000 * attempt);
        console.log(`[cucoSyncV2] Reintento ${attempt} Cuco360...`);
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
          lastCucoError = `Cuco360 devolvió ${response.status}`;
          response = null; continue;
        }
        if (response.status === 403) {
          const text = await response.text();
          if (text.includes('cloudflare') || text.includes('Just a moment')) {
            lastCucoError = `Cuco360 bloqueado por Cloudflare`;
            response = null; await sleep(5000); continue;
          }
          throw new Error(`CUCO360 API Error (403): Acceso denegado`);
        }
        break;
      } catch (fetchErr) {
        lastCucoError = fetchErr.message;
        if (attempt === 2) throw fetchErr;
      }
    }

    if (!response) {
      return Response.json({ success: false, error: lastCucoError, retry_suggested: true }, { status: 503 });
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CUCO360 API Error (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = await response.json();
    if (json.success === false) throw new Error(`CUCO360 error: ${json.message || JSON.stringify(json)}`);

    const checks = json.checks || json.data || json;
    if (!Array.isArray(checks)) {
      return Response.json({ success: true, message: "No data from CUCO360 (empty checks)", count: 0 });
    }

    console.log(`[cucoSyncV2] ✅ Cuco360 devolvió ${checks.length} marcajes`);

    // ── PASO 2: Cargar base maestra ──────────────────────────────────────
    const masterEmployees = await retryOp(() =>
      serviceClient.entities.EmployeeMasterDatabase.list(undefined, 2000)
    );
    const masterMapByCodigo = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) {
        masterMapByCodigo[String(emp.codigo_empleado).trim()] = emp;
      }
    }
    console.log(`[cucoSyncV2] Base maestra: ${masterEmployees.length} empleados`);

    // ── PASO 3: Agrupar marcajes por empleado ────────────────────────────
    const todayBatch = `cuco_v2_sync_${from}`;
    const recordsByEmployee = {};

    for (const check of checks) {
      const externalId = getCheckEmployeeCode(check);
      const fullDate = check.fec_marcaje || check.fecha;
      if (!externalId || !fullDate) continue;

      // Filtrar marcajes sintéticos (cod_marcaje negativo)
      if (check.cod_marcaje !== undefined && Number(check.cod_marcaje) < 0) continue;

      const dateStr = extractDateStr(fullDate);
      const timeStr = extractTimeStr(fullDate);
      const masterEmp = masterMapByCodigo[externalId];
      const direction = parseCheckDirection(check);

      if (!recordsByEmployee[externalId]) recordsByEmployee[externalId] = {};
      if (!recordsByEmployee[externalId][dateStr]) recordsByEmployee[externalId][dateStr] = [];

      recordsByEmployee[externalId][dateStr].push({
        employee_id: externalId,
        employee_name: masterEmp?.nombre || check.nombre || `Empleado ${externalId}`,
        department: masterEmp?.departamento || "Producción",
        record_date: dateStr,
        record_time: timeStr,
        direction,
        device: check.nom_dispositivo || "API CUCO360",
        import_batch: todayBatch
      });
    }

    const employeeCodes = Object.keys(recordsByEmployee);
    console.log(`[cucoSyncV2] Empleados con marcajes: ${employeeCodes.length}`);

    // ── PASO 4: Precargar marcajes existentes en memoria (1 query por día) ──
    // Esto evita 221 queries individuales de lectura → reducción masiva de llamadas API
    const uniqueDatesInData = [...new Set(
      Object.values(recordsByEmployee).flatMap(d => Object.keys(d))
    )];
    const existingKeysMap = {}; // { "empCode_date": Set<"HH:MM_E/S"> }

    for (const dateStr of uniqueDatesInData) {
      console.log(`[cucoSyncV2] Precargando marcajes existentes para ${dateStr}...`);
      // Una sola query con límite alto — normalmente <2000 marcajes por día
      const allExisting = await retryOp(() =>
        serviceClient.entities.AttendanceRecord.filter({ record_date: dateStr }, "employee_id", 2000)
      , 5, 1500).catch(() => []);

      for (const r of (allExisting || [])) {
        const empId = String(r.employee_id || "").trim();
        if (!empId) continue;
        const cacheKey = `${empId}_${dateStr}`;
        if (!existingKeysMap[cacheKey]) existingKeysMap[cacheKey] = new Set();
        existingKeysMap[cacheKey].add(`${r.record_time}_${r.direction}`);
      }
      console.log(`[cucoSyncV2] ${(allExisting || []).length} marcajes existentes precargados para ${dateStr}`);
    }

    // ── PASO 5: Sync en PARALELO por lotes ──────────────────────────────
    // Procesamos BATCH_SIZE empleados simultáneamente con pausa entre lotes
    const BATCH_SIZE = 8; // 8 en paralelo — ahora sin queries de lectura por empleado
    const failedEmployees = [];
    const syncResults = {};
    let totalInserted = 0;

    for (let i = 0; i < employeeCodes.length; i += BATCH_SIZE) {
      const batch = employeeCodes.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(employeeCodes.length / BATCH_SIZE);
      console.log(`[cucoSyncV2] Lote ${batchNum}/${totalBatches} (${batch.length} empleados)...`);

      const batchResults = await processBatch(serviceClient, batch, recordsByEmployee, todayBatch, existingKeysMap);

      for (const settled of batchResults) {
        if (settled.status === 'fulfilled') {
          const { code, results, success } = settled.value;
          syncResults[code] = results;
          if (success) {
            const inserted = Object.values(results).reduce((s, r) => s + r.inserted, 0);
            totalInserted += inserted;
          } else {
            const errors = Object.entries(results)
              .filter(([, r]) => !r.success)
              .map(([d, r]) => `${d}: ${r.error}`)
              .join('; ');
            failedEmployees.push({ code, errors });
          }
        } else {
          // Promise rechazada (error inesperado)
          console.error(`[cucoSyncV2] ❌ Lote error:`, settled.reason);
        }
      }

      // Pausa entre lotes para respetar rate limit
      if (i + BATCH_SIZE < employeeCodes.length) await sleep(500);
    }

    console.log(`[cucoSyncV2] Sync principal: ${totalInserted} marcajes insertados, ${failedEmployees.length} empleados fallidos`);

    // ── PASO 5: Reintentar empleados fallidos ────────────────────────────
    if (failedEmployees.length > 0) {
      console.warn(`[cucoSyncV2] 🔄 Reintentando ${failedEmployees.length} empleados fallidos...`);
      await sleep(2000);
      const retryList = [...failedEmployees];
      failedEmployees.length = 0; // limpiar para repoblar

      for (let i = 0; i < retryList.length; i += BATCH_SIZE) {
        const batch = retryList.slice(i, i + BATCH_SIZE).map(f => f.code);
        // En retry limpiar caché de estos empleados para forzar re-inserción completa
        for (const code of batch) {
          for (const dateStr of Object.keys(recordsByEmployee[code] || {})) {
            delete existingKeysMap[`${code}_${dateStr}`];
          }
        }
        const batchResults = await processBatch(serviceClient, batch, recordsByEmployee, todayBatch, existingKeysMap);
        for (const settled of batchResults) {
          if (settled.status === 'fulfilled') {
            const { code, results, success } = settled.value;
            if (success) {
              const inserted = Object.values(results).reduce((s, r) => s + r.inserted, 0);
              totalInserted += inserted;
              console.log(`[cucoSyncV2] ✅ Recuperado: ${code}`);
            } else {
              const errors = Object.entries(results)
                .filter(([, r]) => !r.success)
                .map(([d, r]) => `${d}: ${r.error}`)
                .join('; ');
              failedEmployees.push({ code, errors });
              console.error(`[cucoSyncV2] ❌ Sigue fallando: ${code}: ${errors}`);
            }
          }
        }
        if (i + BATCH_SIZE < retryList.length) await sleep(500);
      }
    }

    // ── PASO 5b: Sincronizar DailyPresence (agregado diario + cumplimiento horario) ────
    // Crea/actualiza un registro DailyPresence por empleado por día con fichajes,
    // incluyendo cálculo de cumplimiento horario (retraso, salida anticipada, horas no trabajadas).
    try {
      const syncDates = [...new Set(Object.values(recordsByEmployee).flatMap(d => Object.keys(d)))];

      // Cargar turnos de equipo para determinar turno asignado de empleados rotativos
      const mondayOfWeek = (() => {
        const d = getNowSpain();
        const day = d.getDay();
        const diff = (day === 0) ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d.toISOString().split('T')[0];
      })();
      const weekSchedules = await retryOp(() =>
        serviceClient.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: mondayOfWeek })
      ).catch(() => []);
      const teamShiftMap = {};
      for (const ws of weekSchedules) {
        if (ws.team_key && ws.turno) teamShiftMap[ws.team_key] = ws.turno;
      }

      // Cargar DailyPresence existentes (mapa para upsert)
      const dpExistingMap = {};
      for (const dateStr of syncDates) {
        const existing = await retryOp(() =>
          serviceClient.entities.DailyPresence.filter({ record_date: dateStr }, undefined, 5000)
        , 3, 500).catch(() => []);
        for (const r of (existing || [])) {
          dpExistingMap[`${r.employee_code}||${dateStr}`] = r;
        }
      }

      const dpToCreate = [];
      const dpToUpdate = [];
      const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

      for (const [empCode, dateMap] of Object.entries(recordsByEmployee)) {
        const masterEmp = masterMapByCodigo[empCode];
        for (const [dateStr, records] of Object.entries(dateMap)) {
          const sortedRecords = records.slice().sort((a, b) => a.record_time.localeCompare(b.record_time));
          const firstEntry = sortedRecords.find(r => r.direction === 'E')?.record_time || null;
          // Solo usar lastExit si el ÚLTIMO fichaje del día es 'S'
          // (si el último es 'E', la persona sigue dentro o olvidó fichar la salida)
          const lastRecord = sortedRecords[sortedRecords.length - 1];
          const lastExit = (lastRecord && lastRecord.direction === 'S') ? lastRecord.record_time : null;
          const shift = firstEntry ? (parseInt(firstEntry.split(':')[0]) < 12 ? 'Mañana' : 'Tarde') : null;

          // Determinar turno asignado
          let assignedShift = null;
          if (masterEmp) {
            if (masterEmp.tipo_turno === 'Rotativo' && masterEmp.team_key) {
              assignedShift = teamShiftMap[masterEmp.team_key] || null;
            } else if (masterEmp.tipo_turno === 'Fijo Mañana') {
              assignedShift = 'Mañana';
            } else if (masterEmp.tipo_turno === 'Fijo Tarde') {
              assignedShift = 'Tarde';
            }
          }

          const isPastDate = dateStr < todayDateStr;
          const compliance = calculateCompliance(masterEmp, assignedShift, firstEntry, lastExit, isPastDate);

          const baseRecord = {
            employee_id: masterEmp?.id || empCode,
            employee_name: masterEmp?.nombre || records[0]?.employee_name || `Empleado ${empCode}`,
            employee_code: empCode,
            record_date: dateStr,
            present: true,
            shift,
            first_entry: firstEntry,
            last_exit: lastExit,
            check_in_count: records.length,
            source: 'cuco360',
            ...compliance,
          };

          const existingKey = `${empCode}||${dateStr}`;
          if (dpExistingMap[existingKey]) {
            dpToUpdate.push({ id: dpExistingMap[existingKey].id, ...baseRecord });
          } else {
            dpToCreate.push(baseRecord);
          }
        }
      }

      let dpCreated = 0, dpUpdated = 0;
      for (let i = 0; i < dpToCreate.length; i += 500) {
        const batch = dpToCreate.slice(i, i + 500);
        await retryOp(() => serviceClient.entities.DailyPresence.bulkCreate(batch), 3, 500)
          .catch(e => console.warn(`[cucoSyncV2] Error DailyPresence bulkCreate:`, e));
        dpCreated += batch.length;
      }
      for (let i = 0; i < dpToUpdate.length; i += 500) {
        const batch = dpToUpdate.slice(i, i + 500);
        await retryOp(() => serviceClient.entities.DailyPresence.bulkUpdate(batch), 3, 500)
          .catch(e => console.warn(`[cucoSyncV2] Error DailyPresence bulkUpdate:`, e));
        dpUpdated += batch.length;
      }
      console.log(`[cucoSyncV2] DailyPresence: ${dpCreated} creados, ${dpUpdated} actualizados (con cumplimiento horario)`);
    } catch (dpErr) {
      console.warn(`[cucoSyncV2] Error sincronizando DailyPresence:`, dpErr);
    }

    const syncCompleted = failedEmployees.length === 0;
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log(`[cucoSyncV2] ═══ FIN SYNC: ${syncCompleted ? '✅ COMPLETO' : '⚠️ CON ERRORES'} (${durationSeconds}s) · ${totalInserted} marcajes ═══`);

    // ── PASO 6: Análisis de presencia (solo día único, si hay tiempo) ────
    // Solo ejecutamos si el sync tardó menos de 100s (dejamos margen para el análisis)
    const canRunAnalysis = from === to && !skip_analysis && durationSeconds < 100;

    let analysisResult = null;
    if (canRunAnalysis) {
      const syncDate = from;
      const nowSpain = getNowSpain();
      const nowMinutes = getNowSpainMinutes();
      const systemNow = new Date().toISOString();

      const mondayOfWeek = (() => {
        const d = new Date(nowSpain);
        const day = d.getDay();
        const diff = (day === 0) ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d.toISOString().split('T')[0];
      })();

      const [weekSchedules, allAbsences] = await Promise.all([
        retryOp(() => serviceClient.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: mondayOfWeek })).catch(() => []),
        retryOp(() => serviceClient.entities.Absence.list("-fecha_inicio", 2000)).catch(() => [])
      ]);

      const teamShiftMap = {};
      for (const ws of weekSchedules) {
        if (ws.team_key && ws.turno) teamShiftMap[ws.team_key] = ws.turno;
      }

      const syncDateObj = new Date(syncDate + "T12:00:00Z");
      const activeAbsencesToday = allAbsences.filter(abs => {
        if (abs.estado_aprobacion === "Rechazada" || abs.estado_aprobacion === "Cancelada") return false;
        const start = new Date(abs.fecha_inicio);
        const end = abs.fecha_fin_desconocida ? new Date("2099-12-31") : new Date(abs.fecha_fin);
        return start <= syncDateObj && syncDateObj <= end;
      });
      const absenceByEmployee = {};
      for (const abs of activeAbsencesToday) {
        if (!absenceByEmployee[abs.employee_id]) absenceByEmployee[abs.employee_id] = abs;
      }

      const controlledEmployees = masterEmployees.filter(emp =>
        emp.estado_empleado === "Alta" && emp.sujeto_a_control_horario !== false
      );

      // Set de empleados que ficharon HOY — usar caché precargada (sin query extra)
      // Incluye: (1) los que tenían registros en BD antes del sync, (2) los recién insertados
      const ficharonHoy = new Set();

      // De la caché precargada: empleados que ya tenían entrada antes del sync
      // NOTA: cacheKey = "empCode_YYYY-MM-DD". La fecha siempre es el sufijo YYYY-MM-DD (10 chars).
      for (const [cacheKey, keysSet] of Object.entries(existingKeysMap)) {
        const dateStr = cacheKey.slice(-10);           // últimos 10 chars = "YYYY-MM-DD"
        if (dateStr !== syncDate) continue;
        const code = cacheKey.slice(0, cacheKey.length - 11); // empCode (todo menos "_YYYY-MM-DD")
        for (const key of keysSet) {
          if (key.endsWith('_E')) { ficharonHoy.add(code); break; }
        }
      }

      // De los recién insertados en este sync
      for (const [code, dateMap] of Object.entries(syncResults)) {
        if (Object.values(dateMap).some(r => r.success)) {
          const hasEntry = Object.values(recordsByEmployee[code] || {})
            .flatMap(records => records)
            .some(r => r.direction === 'E');
          if (hasEntry) ficharonHoy.add(code);
        }
      }

      const reactivados = [], confirmados = [], nuevosRetrasos = [], nuevasAusencias = [];
      const RETRASO_MIN = 5;
      const AUSENCIA_MIN = 20;

      for (const emp of controlledEmployees) {
        const code = String(emp.codigo_empleado || "").trim();
        if (!code) continue;
        const hasFichado = ficharonHoy.has(code);
        const absenceRecord = absenceByEmployee[emp.id];

        let assignedShift = null;
        if (emp.tipo_turno === 'Rotativo' && emp.team_key) {
          assignedShift = teamShiftMap[emp.team_key] || null;
        } else if (emp.tipo_turno === 'Fijo Mañana') {
          assignedShift = 'Mañana';
        } else if (emp.tipo_turno === 'Fijo Tarde') {
          assignedShift = 'Tarde';
        }

        const shiftInfo = getEmployeeShiftToday(emp, assignedShift);

        if (hasFichado) {
          const hasAutoAbsencePending = absenceRecord &&
            absenceRecord.estado_aprobacion === "Pendiente" &&
            (absenceRecord.tipo === "Ausencia No Justificada" || (absenceRecord.notas || "").includes("[SISTEMA]") || (absenceRecord.notas || "").includes("[shiftAudit]"));

          if (emp.disponibilidad === "Ausente" || emp.estado_presencia === "Retraso" || emp.estado_presencia === "Ausente Auto" || hasAutoAbsencePending) {
            reactivados.push({ emp, absence: absenceRecord });
          }
        } else {
          if (absenceRecord) {
            confirmados.push({ emp, absence: absenceRecord });
          } else if (shiftInfo !== null) {
            const minutesSinceStart = nowMinutes - shiftInfo.shiftStart;
            if (minutesSinceStart >= AUSENCIA_MIN && emp.estado_presencia !== "Ausente Auto" && emp.disponibilidad !== "Ausente") {
              nuevasAusencias.push({ emp, shiftInfo });
            } else if (minutesSinceStart >= RETRASO_MIN && minutesSinceStart < AUSENCIA_MIN && emp.estado_presencia !== "Retraso" && emp.estado_presencia !== "Ausente Auto" && emp.disponibilidad !== "Ausente") {
              nuevosRetrasos.push({ emp, shiftInfo });
            }
          }
        }
      }

      const writeAuditLog = async (entry) => {
        await retryOp(() => serviceClient.entities.AbsenceAuditLog.create(entry))
          .catch(e => console.warn(`[cucoSyncV2] Error audit log:`, e));
      };

      // Ejecutar actualizaciones en paralelo por lotes
      const reactivadosBatch = reactivados.map(({ emp, absence }) => async () => {
        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Disponible", estado_presencia: "Presente",
          ausencia_fin: systemNow, ausencia_motivo: null, potencialmente_ausente_desde: null
        })).catch(e => console.warn(`[cucoSyncV2] Error reactivando ${emp.nombre}:`, e));
        if (absence && (emp.disponibilidad === "Ausente" || emp.estado_presencia === "Ausente Auto")) {
          await retryOp(() => serviceClient.entities.Absence.update(absence.id, {
            fecha_fin: systemNow, fecha_fin_desconocida: false, estado_aprobacion: "Cancelada",
            comentario_aprobacion: `[SISTEMA] Cerrada automáticamente el ${syncDate}: fichaje detectado.`
          })).catch(e => console.warn(`[cucoSyncV2] Error cerrando ausencia ${emp.nombre}:`, e));
        }
        await writeAuditLog({
          employee_id: emp.id, employee_name: emp.nombre, employee_dept: emp.departamento || "",
          action_type: "reactivacion_por_presencia", absence_id: absence?.id || null,
          sync_date: syncDate, origen: "cucoSyncV2",
          estado_anterior: emp.estado_presencia || emp.disponibilidad, estado_nuevo: "Presente",
          motivo: `Fichaje detectado. ${absence ? "Ausencia previa cerrada." : ""}`,
          leido_por_rrhh: false, notas: `[SISTEMA] Sync robusto ${systemNow}`
        });
        console.log(`[cucoSyncV2] ✅ REACTIVADO: ${emp.nombre}`);
      });

      const confirmedBatch = confirmados.map(({ emp, absence }) => async () => {
        if (emp.disponibilidad !== "Ausente") {
          await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
            disponibilidad: "Ausente", estado_presencia: "Ausente",
            ausencia_inicio: absence.fecha_inicio,
            ausencia_fin: absence.fecha_fin_desconocida ? null : absence.fecha_fin,
            ausencia_motivo: `${absence.tipo || absence.motivo} (ausencia configurada)`
          })).catch(e => console.warn(`[cucoSyncV2] Error confirmando ${emp.nombre}:`, e));
          await writeAuditLog({
            employee_id: emp.id, employee_name: emp.nombre, employee_dept: emp.departamento || "",
            action_type: "ausencia_confirmada", absence_id: absence.id,
            sync_date: syncDate, origen: "cucoSyncV2",
            estado_anterior: emp.disponibilidad || "Disponible", estado_nuevo: "Ausente",
            motivo: `${absence.tipo || absence.motivo} - sin fichaje`,
            leido_por_rrhh: false, notas: `[SISTEMA] Confirmación - sync ${systemNow}`
          });
          console.log(`[cucoSyncV2] 🔵 CONFIRMADA: ${emp.nombre}`);
        }
      });

      const retrasosBatch = nuevosRetrasos.map(({ emp, shiftInfo }) => async () => {
        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          estado_presencia: "Retraso", potencialmente_ausente_desde: systemNow
        })).catch(e => console.warn(`[cucoSyncV2] Error retraso ${emp.nombre}:`, e));
        await writeAuditLog({
          employee_id: emp.id, employee_name: emp.nombre, employee_dept: emp.departamento || "",
          action_type: "retraso_detectado", absence_id: null,
          sync_date: syncDate, origen: "cucoSyncV2",
          estado_anterior: emp.estado_presencia || "Presente", estado_nuevo: "Retraso",
          motivo: `Retraso: turno ${minutesToTime(shiftInfo.shiftStart)} — sin fichaje a las ${minutesToTime(nowMinutes)}`,
          leido_por_rrhh: false, notas: `[SISTEMA] Sync ${systemNow}`
        });
      });

      const ausenciasBatch = nuevasAusencias.map(({ emp, shiftInfo }) => async () => {
        const absenceStart = `${syncDate}T${minutesToTime(shiftInfo.shiftStart)}:00`;
        const absenceEnd = shiftInfo.shiftEnd !== null
          ? `${syncDate}T${minutesToTime(shiftInfo.shiftEnd)}:00`
          : `${syncDate}T${minutesToTime(shiftInfo.shiftStart + 480)}:00`;

        // ── DEDUP: Verificar si ya existe ausencia auto pendiente para este empleado en este turno/fecha ──
        const existingAutoAbsence = allAbsences.find(abs => {
          if (abs.employee_id !== emp.id) return false;
          if (abs.estado_aprobacion === "Rechazada" || abs.estado_aprobacion === "Cancelada") return false;
          const isAuto = abs.motivo === "Ausencia no comunicada - detección automática" ||
            (abs.notas || "").includes("[SISTEMA]") || (abs.notas || "").includes("[shiftAudit]");
          if (!isAuto) return false;
          // Misma fecha de inicio de turno
          return abs.fecha_inicio && abs.fecha_inicio.startsWith(absenceStart);
        });

        if (existingAutoAbsence) {
          console.log(`[cucoSyncV2] ⏭️ SKIP DEDUP: ${emp.nombre} - ya existe ausencia pendiente (id: ${existingAutoAbsence.id})`);
          return; // No crear duplicado
        }

        await retryOp(() => serviceClient.entities.EmployeeMasterDatabase.update(emp.id, {
          disponibilidad: "Ausente", estado_presencia: "Ausente Auto",
          ausencia_inicio: absenceStart,
          ausencia_motivo: "Ausencia no comunicada - detección automática",
          potencialmente_ausente_desde: systemNow
        })).catch(e => console.warn(`[cucoSyncV2] Error ausencia auto ${emp.nombre}:`, e));

        const created = await retryOp(() => serviceClient.entities.Absence.create({
          employee_id: emp.id, fecha_inicio: absenceStart, fecha_fin: absenceEnd,
          fecha_fin_desconocida: true, motivo: "Ausencia no comunicada - detección automática",
          tipo: "Ausencia No Justificada", estado_aprobacion: "Pendiente", remunerada: false,
          notas: `[SISTEMA] Ausencia auto cucoSyncV2 ${systemNow}. Turno: ${minutesToTime(shiftInfo.shiftStart)}-${minutesToTime(shiftInfo.shiftEnd)}.`
        })).catch(e => { console.warn(`[cucoSyncV2] Error creando ausencia ${emp.nombre}:`, e); return null; });

        await writeAuditLog({
          employee_id: emp.id, employee_name: emp.nombre, employee_dept: emp.departamento || "",
          action_type: "ausencia_auto_creada", absence_id: created?.id || null,
          sync_date: syncDate, origen: "cucoSyncV2",
          estado_anterior: emp.estado_presencia || "Disponible", estado_nuevo: "Ausente Auto",
          motivo: `Sin fichaje a las ${minutesToTime(nowMinutes)}. Turno: ${minutesToTime(shiftInfo.shiftStart)}-${minutesToTime(shiftInfo.shiftEnd)}.`,
          leido_por_rrhh: false, notas: `[SISTEMA] Creación automática - sync ${systemNow}`
        });
        console.log(`[cucoSyncV2] 🔴 AUSENCIA AUTO: ${emp.nombre}`);
      });

      // Ejecutar todas las actualizaciones de análisis en paralelo (lotes de 8)
      const allAnalysisTasks = [...reactivadosBatch, ...confirmedBatch, ...retrasosBatch, ...ausenciasBatch];
      for (let i = 0; i < allAnalysisTasks.length; i += 8) {
        await Promise.allSettled(allAnalysisTasks.slice(i, i + 8).map(fn => fn()));
        if (i + 8 < allAnalysisTasks.length) await sleep(150);
      }

      analysisResult = {
        employees_controlled: controlledEmployees.length,
        ficharon: ficharonHoy.size,
        reactivados: reactivados.length,
        ausencias_confirmadas: confirmados.length,
        nuevos_retrasos: nuevosRetrasos.length,
        nuevas_ausencias_auto: nuevasAusencias.length,
        hora_spain: minutesToTime(nowMinutes),
        turnos_equipo: teamShiftMap
      };
    } else if (from === to && !skip_analysis) {
      // Sync tardó demasiado — disparar análisis como tarea separada (no bloqueante)
      console.warn(`[cucoSyncV2] ⚠️ Sync tardó ${durationSeconds}s — análisis de presencia omitido para evitar timeout. Usa la automatización shiftAudit para el análisis.`);
    }

    const syncStatus = syncCompleted ? "success" : (failedEmployees.length > 0 ? "partial" : "warning");

    return Response.json({
      success: syncCompleted,
      status: syncStatus,
      message: syncCompleted
        ? `Sync completo ✅: ${totalInserted} fichajes de ${employeeCodes.length} empleados`
        : `Sync parcial ⚠️: ${totalInserted} fichajes OK, ${failedEmployees.length} empleados fallidos`,
      count: totalInserted,
      duration_seconds: durationSeconds,
      integrity: {
        employees_total: employeeCodes.length,
        employees_ok: employeeCodes.length - failedEmployees.length,
        employees_failed: failedEmployees.length,
        failed_list: failedEmployees.slice(0, 50) // limitar respuesta
      },
      analysis: analysisResult
    });

  } catch (err) {
    console.error("[cucoSyncV2] Error crítico:", err);
    return Response.json({ success: false, status: "error", error: err.message }, { status: 500 });
  }
});