import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getEmployeeShiftToday(emp, assignedShift) {
  const nowMinutes = getNowSpainMinutes();
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
  const mStart = timeToMinutes(emp.horario_manana_inicio);
  const tStart = timeToMinutes(emp.horario_tarde_inicio);
  if (mStart !== null && tStart !== null) {
    const mDiff = nowMinutes - mStart;
    const tDiff = nowMinutes - tStart;
    if (mDiff >= 0 && (tDiff < 0 || mDiff < tDiff)) return { shiftStart: mStart, shiftEnd: timeToMinutes(emp.horario_manana_fin) };
    if (tDiff >= 0) return { shiftStart: tStart, shiftEnd: timeToMinutes(emp.horario_tarde_fin) };
    return mStart < tStart
      ? { shiftStart: mStart, shiftEnd: timeToMinutes(emp.horario_manana_fin) }
      : { shiftStart: tStart, shiftEnd: timeToMinutes(emp.horario_tarde_fin) };
  }
  if (mStart !== null) return { shiftStart: mStart, shiftEnd: timeToMinutes(emp.horario_manana_fin) };
  if (tStart !== null) return { shiftStart: tStart, shiftEnd: timeToMinutes(emp.horario_tarde_fin) };
  return null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOp(fn, retries = 4, baseDelay = 800) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isRate = e?.message?.includes('Rate limit') || e?.message?.includes('429');
      if (i < retries - 1) {
        const delay = isRate ? baseDelay * Math.pow(2, i) : baseDelay;
        console.log(`[cucoSyncV2] Retry ${i + 1}/${retries - 1} in ${delay}ms: ${e.message?.slice(0, 80)}`);
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync atómico por empleado: borra y reinserta solo los registros de UN empleado
// para un día. Si falla, solo ese empleado queda afectado.
// Devuelve { success, deleted, inserted, error? }
// ─────────────────────────────────────────────────────────────────────────────
async function syncEmployeeRecords(serviceClient, employeeCode, dateStr, records, batchId) {
  const result = { success: false, deleted: 0, inserted: 0, verified: false, error: null };

  try {
    // 1. Borrar registros existentes de este empleado para este día (secuencial, sin saturar)
    let safetyLoop = 5;
    while (safetyLoop-- > 0) {
      const existing = await retryOp(() =>
        serviceClient.entities.AttendanceRecord.filter(
          { record_date: dateStr, employee_id: employeeCode }, "id", 200
        ), 5, 1500
      );
      if (!existing || existing.length === 0) break;
      // Borrar de 5 en 5 con pausa — evita saturar la API
      const CHUNK = 5;
      for (let i = 0; i < existing.length; i += CHUNK) {
        const chunk = existing.slice(i, i + CHUNK);
        await Promise.allSettled(chunk.map(r =>
          retryOp(() => serviceClient.entities.AttendanceRecord.delete(r.id), 5, 1500)
        ));
        result.deleted += chunk.length;
        await sleep(400);
      }
      if (existing.length < 200) break;
      await sleep(500);
    }

    // 2. Insertar nuevos registros
    if (records.length > 0) {
      await retryOp(() => serviceClient.entities.AttendanceRecord.bulkCreate(records), 5, 1500);
      result.inserted = records.length;
    }

    // 3. VERIFICACIÓN: confirmar que los registros insertados están en BD
    await sleep(500);
    const verification = await retryOp(() =>
      serviceClient.entities.AttendanceRecord.filter(
        { record_date: dateStr, employee_id: employeeCode }, "id", 200
      ), 5, 1500
    );
    const countInDB = verification ? verification.length : 0;

    if (records.length > 0 && countInDB < records.length) {
      result.error = `Verificación fallida: esperados ${records.length}, encontrados ${countInDB} en BD`;
      result.verified = false;
      result.success = false;
      console.error(`[cucoSyncV2] ❌ INTEGRIDAD FALLIDA - ${employeeCode}: ${result.error}`);
    } else {
      result.verified = true;
      result.success = true;
    }

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

    // Auth
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

    console.log(`[cucoSyncV2] ═══ INICIO SYNC ROBUSTO ${from}→${to} ═══`);
    console.log(`[cucoSyncV2] Hora Spain: ${minutesToTime(getNowSpainMinutes())}`);

    // ── PASO 1: Obtener marcajes de Cuco360 con reintentos ─────────────────
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

    // ── PASO 2: Cargar base maestra ─────────────────────────────────────────
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

    // ── PASO 3: Agrupar marcajes por empleado ───────────────────────────────
    const todayBatch = `cuco_v2_sync_${from}`;
    const recordsByEmployee = {}; // { employeeCode: [records...] }

    for (const check of checks) {
      const externalId = String(check.cod_int_empleado || check.cod_interno || check.cod_empleado || "").trim();
      const fullDate = check.fec_marcaje || check.fecha;
      if (!externalId || !fullDate) continue;

      // Filtrar marcajes sintéticos (cod_marcaje negativo)
      if (check.cod_marcaje !== undefined && Number(check.cod_marcaje) < 0) continue;

      const dateParts = fullDate.split(' ');
      const dateStr = dateParts[0];
      const timeStr = (dateParts[1] || '00:00').slice(0, 5);
      const masterEmp = masterMapByCodigo[externalId];
      const type = String(check.val_direccion || "").toUpperCase();
      const direction = (type === "S" || type === "SALIDA" || type === "OUT" || type === "2") ? "S" : "E";

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

    // ── PASO 4: Sync atómico por empleado con verificación ─────────────────
    // Procesamos de 3 en 3 empleados en paralelo para no saturar la API (rate limit)
    const PARALLEL = 3;
    const syncResults = {}; // { employeeCode: { success, deleted, inserted, verified, error } }
    const failedEmployees = [];
    let totalInserted = 0;

    for (let i = 0; i < employeeCodes.length; i += PARALLEL) {
      const batch = employeeCodes.slice(i, i + PARALLEL);
      const batchResults = await Promise.all(
        batch.map(async (code) => {
          const dateMap = recordsByEmployee[code];
          const results = {};
          for (const [dateStr, records] of Object.entries(dateMap)) {
            const r = await syncEmployeeRecords(serviceClient, code, dateStr, records, todayBatch);
            results[dateStr] = r;
          }
          return { code, results };
        })
      );

      for (const { code, results } of batchResults) {
        syncResults[code] = results;
        const allDatesOk = Object.values(results).every(r => r.success);
        if (!allDatesOk) {
          const errors = Object.entries(results)
            .filter(([, r]) => !r.success)
            .map(([d, r]) => `${d}: ${r.error}`)
            .join('; ');
          failedEmployees.push({ code, errors });
          console.error(`[cucoSyncV2] ❌ FALLÓ empleado ${code}: ${errors}`);
        } else {
          const inserted = Object.values(results).reduce((s, r) => s + r.inserted, 0);
          totalInserted += inserted;
        }
      }

      // Pausa entre batches para respetar rate limit
      if (i + PARALLEL < employeeCodes.length) await sleep(600);
    }

    // ── PASO 5: Reintentar empleados fallidos (hasta 2 veces más) ──────────
    let retryRound = 0;
    let stillFailing = [...failedEmployees];

    while (stillFailing.length > 0 && retryRound < 2) {
      retryRound++;
      console.warn(`[cucoSyncV2] 🔄 Reintento ${retryRound} para ${stillFailing.length} empleados fallidos...`);
      await sleep(2000 * retryRound);

      const retryList = [...stillFailing];
      stillFailing = [];

      for (let i = 0; i < retryList.length; i += PARALLEL) {
        const batch = retryList.slice(i, i + PARALLEL);
        const batchResults = await Promise.all(
          batch.map(async ({ code }) => {
            const dateMap = recordsByEmployee[code];
            const results = {};
            for (const [dateStr, records] of Object.entries(dateMap)) {
              const r = await syncEmployeeRecords(serviceClient, code, dateStr, records, todayBatch);
              results[dateStr] = r;
            }
            return { code, results };
          })
        );

        for (const { code, results } of batchResults) {
          const allDatesOk = Object.values(results).every(r => r.success);
          if (!allDatesOk) {
            const errors = Object.entries(results)
              .filter(([, r]) => !r.success)
              .map(([d, r]) => `${d}: ${r.error}`)
              .join('; ');
            stillFailing.push({ code, errors });
          } else {
            const idx = failedEmployees.findIndex(f => f.code === code);
            if (idx >= 0) failedEmployees.splice(idx, 1);
            const inserted = Object.values(results).reduce((s, r) => s + r.inserted, 0);
            totalInserted += inserted;
            console.log(`[cucoSyncV2] ✅ Recuperado en reintento ${retryRound}: ${code}`);
          }
        }
        await sleep(800); // más pausa en reintentos
      }
    }

    // Actualizar failedEmployees final con los que siguen fallando
    for (const sf of stillFailing) {
      if (!failedEmployees.find(f => f.code === sf.code)) failedEmployees.push(sf);
    }

    // ── PASO 6: Verificación global de integridad ───────────────────────────
    const uniqueDates = [...new Set(
      Object.values(recordsByEmployee).flatMap(d => Object.keys(d))
    )];

    const integrityReport = [];
    for (const d of uniqueDates) {
      const expectedByDate = {};
      for (const [code, dateMap] of Object.entries(recordsByEmployee)) {
        if (dateMap[d]) expectedByDate[code] = dateMap[d].length;
      }
      const expectedTotal = Object.values(expectedByDate).reduce((s, c) => s + c, 0);
      
      // Contar registros reales en BD para este día
      let actualTotal = 0;
      let safetyLoop = 20;
      let skip = 0;
      while (safetyLoop-- > 0) {
        const page = await retryOp(() =>
          serviceClient.entities.AttendanceRecord.filter({ record_date: d, import_batch: todayBatch }, "-record_time", 500)
        ).catch(() => []);
        if (!page || page.length === 0) break;
        actualTotal += page.length;
        if (page.length < 500) break;
        skip += 500;
      }

      const integrity = {
        date: d,
        expected: expectedTotal,
        actual_in_db: actualTotal,
        match: actualTotal >= expectedTotal,
        missing: Math.max(0, expectedTotal - actualTotal)
      };
      integrityReport.push(integrity);
      
      if (!integrity.match) {
        console.error(`[cucoSyncV2] ⚠️ INTEGRIDAD DÍA ${d}: esperados ${expectedTotal}, en BD ${actualTotal} (faltan ${integrity.missing})`);
      } else {
        console.log(`[cucoSyncV2] ✅ Integridad OK ${d}: ${actualTotal}/${expectedTotal} registros`);
      }
    }

    const daysWithIssues = integrityReport.filter(r => !r.match);
    const syncCompleted = failedEmployees.length === 0 && daysWithIssues.length === 0;
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    console.log(`[cucoSyncV2] ═══ FIN SYNC: ${syncCompleted ? '✅ COMPLETO' : '⚠️ CON ERRORES'} (${durationSeconds}s) ═══`);
    console.log(`[cucoSyncV2] Insertados: ${totalInserted}, Empleados fallidos: ${failedEmployees.length}`);

    // ── PASO 7: Análisis de presencia (solo día único y sin errores críticos) ─
    if (from === to && !skip_analysis) {
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
      const weekSchedules = await retryOp(() =>
        serviceClient.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: mondayOfWeek })
      ).catch(() => []);

      const teamShiftMap = {};
      for (const ws of weekSchedules) {
        if (ws.team_key && ws.turno) teamShiftMap[ws.team_key] = ws.turno;
      }

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
        if (!absenceByEmployee[abs.employee_id]) absenceByEmployee[abs.employee_id] = abs;
      }

      const controlledEmployees = masterEmployees.filter(emp =>
        emp.estado_empleado === "Alta" && emp.sujeto_a_control_horario !== false
      );

      // Usamos los codes de empleados que SÍ se insertaron correctamente
      const ficharonHoy = new Set(
        Object.entries(syncResults)
          .filter(([, dateMap]) => Object.values(dateMap).some(r => r.success))
          .flatMap(([code, dateMap]) => {
            const hasEntry = Object.values(recordsByEmployee[code] || {})
              .flatMap(records => records)
              .some(r => r.direction === 'E');
            return hasEntry ? [code] : [];
          })
      );

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
          if (emp.disponibilidad === "Ausente" || emp.estado_presencia === "Retraso" || emp.estado_presencia === "Ausente Auto") {
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

      for (const { emp, absence } of reactivados) {
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
      }

      for (const { emp, absence } of confirmados) {
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
        }
        console.log(`[cucoSyncV2] 🔵 CONFIRMADA: ${emp.nombre}`);
      }

      for (const { emp, shiftInfo } of nuevosRetrasos) {
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
        console.log(`[cucoSyncV2] ⚠️ RETRASO: ${emp.nombre}`);
      }

      for (const { emp, shiftInfo } of nuevasAusencias) {
        const absenceStart = `${syncDate}T${minutesToTime(shiftInfo.shiftStart)}:00`;
        const absenceEnd = shiftInfo.shiftEnd !== null
          ? `${syncDate}T${minutesToTime(shiftInfo.shiftEnd)}:00`
          : `${syncDate}T${minutesToTime(shiftInfo.shiftStart + 480)}:00`;

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
      }

      // Preparar respuesta con informe completo
      const analysisResult = {
        employees_controlled: controlledEmployees.length,
        ficharon: ficharonHoy.size,
        reactivados: reactivados.length,
        ausencias_confirmadas: confirmados.length,
        nuevos_retrasos: nuevosRetrasos.length,
        nuevas_ausencias_auto: nuevasAusencias.length,
        hora_spain: minutesToTime(nowMinutes),
        turnos_equipo: teamShiftMap
      };

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
          failed_list: failedEmployees,
          days: integrityReport
        },
        analysis: analysisResult
      });
    }

    const syncStatus = syncCompleted ? "success" : (failedEmployees.length > 0 ? "partial" : "warning");

    return Response.json({
      success: syncCompleted,
      status: syncStatus,
      message: syncCompleted
        ? `Sync completo ✅: ${totalInserted} fichajes de ${employeeCodes.length} empleados`
        : `Sync parcial ⚠️: ${totalInserted} OK, ${failedEmployees.length} empleados fallidos`,
      count: totalInserted,
      duration_seconds: durationSeconds,
      integrity: {
        employees_total: employeeCodes.length,
        employees_ok: employeeCodes.length - failedEmployees.length,
        employees_failed: failedEmployees.length,
        failed_list: failedEmployees,
        days: integrityReport
      }
    });

  } catch (err) {
    console.error("[cucoSyncV2] Error crítico:", err);
    return Response.json({ success: false, status: "error", error: err.message }, { status: 500 });
  }
});