import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { sleep, parseCheckDirection, extractTimeStr, extractDateStr, getCheckEmployeeCode } from '../../shared/cuco360Utils.ts';

const fmtDate = (d: Date): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const SCHEDULER_SECRET = 'b44_cde_sched_7f3a9b2e8c1d4a6f5b7c9e1d3a2b4c6';
    const hasAuthHeader = !!req.headers.get('authorization');
    let user: any = null;
    try { user = await base44.auth.me(); } catch (_) {}
    const body = await req.json().catch(() => ({}));
    const isSchedulerCall = body._scheduler_secret === SCHEDULER_SECRET;
    if (!user && !isSchedulerCall && !hasAuthHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user && user.role?.toLowerCase() !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { start_date, end_date, chunk_days } = body;

    const now = new Date();
    const end = end_date ? new Date(end_date + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const start = start_date ? new Date(start_date + 'T00:00:00') : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const apiKey = secrets.get('CUCO360_API_KEY');
    if (!apiKey) throw new Error("Secret 'CUCO360_API_KEY' is not configured.");
    const CLIENT_CODE = secrets.get('CUCO_CLIENT_CODE') || '380';
    const authHeader = apiKey.replace('Bearer ', '').trim();

    // Cargar base maestra de empleados
    const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 2000);
    const masterMapByCodigo: Record<string, any> = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) {
        masterMapByCodigo[String(emp.codigo_empleado).trim()] = emp;
      }
    }
    console.log(`[syncHistorical] Base maestra: ${masterEmployees.length} empleados`);

    // Cargar DailyPresence existente para todo el rango (deduplicación)
    const existingKeys = new Set<string>();
    let cursorDate = fmtDate(start);
    const endDateStr = fmtDate(end);
    let hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.DailyPresence.filter(
        { record_date: { $gte: cursorDate, $lte: endDateStr } },
        'record_date',
        5000
      );
      for (const r of batch) {
        existingKeys.add(`${r.employee_code}||${r.record_date}`);
      }
      if (batch.length < 5000) {
        hasMore = false;
      } else {
        // Avanzar cursor: última fecha del lote + 1 día
        const lastDate = batch[batch.length - 1]?.record_date;
        if (!lastDate || lastDate === cursorDate) { hasMore = false; break; }
        cursorDate = lastDate;
      }
    }
    console.log(`[syncHistorical] DailyPresence existente: ${existingKeys.size} registros`);

    // Dividir el rango en bloques de N días (la API de Cuco360 admite máximo 10)
    const CHUNK = Math.min(chunk_days || 10, 10);
    const chunks: Array<{ from: string; to: string }> = [];
    let chunkStart = new Date(start);
    while (chunkStart <= end) {
      const chunkEnd = new Date(chunkStart);
      chunkEnd.setDate(chunkEnd.getDate() + CHUNK - 1);
      if (chunkEnd > end) chunkEnd.setTime(end.getTime());
      chunks.push({ from: fmtDate(chunkStart), to: fmtDate(chunkEnd) });
      chunkStart.setDate(chunkStart.getDate() + CHUNK);
    }
    console.log(`[syncHistorical] ${chunks.length} bloques de ${CHUNK} días`);

    let totalCreated = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (let ci = 0; ci < chunks.length; ci++) {
      const { from, to } = chunks[ci];
      console.log(`[syncHistorical] Bloque ${ci + 1}/${chunks.length}: ${from} → ${to}`);

      const startEnc = encodeURIComponent(`${from} 00:00:00`);
      const endEnc = encodeURIComponent(`${to} 23:59:59`);
      const url = `https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/${CLIENT_CODE}?start_date=${startEnc}&end_date=${endEnc}`;

      let response: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              accept: 'application/json',
              APIkey: authHeader,
              'X-CSRF-TOKEN': '',
            },
          });
          if (response.status === 429 || response.status === 503) {
            response = null;
            await sleep(3000 * (attempt + 1));
            continue;
          }
          break;
        } catch (e) {
          if (attempt === 2) throw e;
          await sleep(3000 * (attempt + 1));
        }
      }

      if (!response || !response.ok) {
        const txt = response ? await response.text() : 'No response';
        errors.push(`${from}→${to}: ${txt.slice(0, 100)}`);
        continue;
      }

      const json = await response.json();
      if (json.success === false) {
        errors.push(`${from}→${to}: ${json.message}`);
        continue;
      }

      const checks = json.checks || json.data || json;
      if (!Array.isArray(checks)) continue;

      // Agrupar fichajes por empleado+fecha
      const presenceMap: Record<string, { code: string; date: string; entries: string[]; exits: string[]; count: number }> = {};
      for (const check of checks) {
        const externalId = getCheckEmployeeCode(check);
        const fullDate = check.fec_marcaje || check.fecha;
        if (!externalId || !fullDate) continue;
        if (check.cod_marcaje !== undefined && Number(check.cod_marcaje) < 0) continue;

        const dateStr = extractDateStr(fullDate);
        const timeStr = extractTimeStr(fullDate);
        const direction = parseCheckDirection(check);

        const key = `${externalId}||${dateStr}`;
        if (!presenceMap[key]) {
          presenceMap[key] = { code: externalId, date: dateStr, entries: [], exits: [], count: 0 };
        }
        presenceMap[key].count++;
        if (direction === 'E') presenceMap[key].entries.push(timeStr);
        else presenceMap[key].exits.push(timeStr);
      }

      // Crear registros DailyPresence (solo para empleados presentes)
      const newRecords: any[] = [];
      for (const [key, data] of Object.entries(presenceMap)) {
        if (existingKeys.has(key)) {
          totalSkipped++;
          continue;
        }
        const masterEmp = masterMapByCodigo[data.code];
        const firstEntry = data.entries.sort()[0] || null;
        const lastExit = data.exits.sort().reverse()[0] || null;
        const shift = firstEntry ? (parseInt(firstEntry.split(':')[0]) < 12 ? 'Mañana' : 'Tarde') : null;

        newRecords.push({
          employee_id: masterEmp?.id || data.code,
          employee_name: masterEmp?.nombre || `Empleado ${data.code}`,
          employee_code: data.code,
          record_date: data.date,
          present: true,
          shift,
          first_entry: firstEntry,
          last_exit: lastExit,
          check_in_count: data.count,
          source: 'cuco360',
        });
        existingKeys.add(key);
      }

      // bulkCreate en lotes de 500
      for (let i = 0; i < newRecords.length; i += 500) {
        const batch = newRecords.slice(i, i + 500);
        await base44.asServiceRole.entities.DailyPresence.bulkCreate(batch);
        totalCreated += batch.length;
      }

      console.log(`[syncHistorical] Bloque ${ci + 1}: ${newRecords.length} creados, ${Object.keys(presenceMap).length - newRecords.length} duplicados`);
      await sleep(1000);
    }

    return Response.json({
      success: true,
      message: `Sync histórico completo: ${totalCreated} registros DailyPresence creados, ${totalSkipped} duplicados saltados`,
      totalCreated,
      totalSkipped,
      chunks: chunks.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[syncHistorical] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}