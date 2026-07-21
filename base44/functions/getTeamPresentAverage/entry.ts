/**
 * getTeamPresentAverage
 * Calcula la mediana de operarios de Producción presentes por equipo
 * (team_1 / team_2) a partir del histórico de fichajes (AttendanceRecord,
 * direction "E") de los últimos N días (excluyendo hoy).
 *
 * Payload: { days?: number }  // por defecto 14
 * Respuesta: { team_1: number, team_2: number, daysUsed: number, perDay: {...} }
 *
 * Se usa la mediana (robusta) para evitar días atípicos con fichaje incompleto.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalize(s) {
  if (!s) return '';
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isProductionOperator(e) {
  const dept = normalize(e.departamento);
  if (!(dept.includes('produccion') || dept.includes('fabricacion') || dept.includes('operaciones'))) return false;
  if ((e.estado_empleado || 'Alta') !== 'Alta') return false;
  const role = normalize(e.puesto);
  if (!role || role.includes('jefe')) return false;
  if (role.includes('responsable') && role.includes('turno')) return false;
  return true;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const HISTORY_DAYS = Math.max(2, Math.min(30, Number(body.days) || 14));

    // 1) Empleados de producción → mapa codigo_empleado → team_key
    const allEmployees = [];
    let skip = 0;
    while (skip < 4000) {
      const page = await base44.asServiceRole.entities.EmployeeMasterDatabase.list('-created_date', 1000, skip);
      const items = Array.isArray(page) ? page : (page?.items || []);
      allEmployees.push(...items);
      if (items.length < 1000) break;
      skip += 1000;
    }

    const codeToTeam = {};
    for (const e of allEmployees) {
      if (!isProductionOperator(e)) continue;
      if (!e.codigo_empleado) continue;
      codeToTeam[e.codigo_empleado] = e.team_key || '_sin_equipo';
    }

    // 2) Fichajes "E" de los últimos HISTORY_DAYS (excluyendo hoy)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(today);
    from.setDate(from.getDate() - HISTORY_DAYS);
    const fromISO = from.toISOString().split('T')[0];
    const toISO = new Date(today.getTime() - 86400000).toISOString().split('T')[0];

    const att = [];
    let skipA = 0;
    while (skipA < 30000) {
      const page = await base44.asServiceRole.entities.AttendanceRecord.filter(
        { direction: 'E', record_date: { $gte: fromISO, $lte: toISO } },
        '-record_date',
        1000,
        skipA
      );
      const items = Array.isArray(page) ? page : (page?.items || []);
      att.push(...items);
      if (items.length < 1000) break;
      skipA += 1000;
    }

    // 3) Por día, presentes distintos por equipo
    const daily = {}; // 'YYYY-MM-DD' -> { team_key -> Set(codigo) }
    for (const r of att) {
      if (!r.record_date) continue;
      const tk = codeToTeam[r.employee_id];
      if (!tk || tk === '_sin_equipo') continue;
      if (!daily[r.record_date]) daily[r.record_date] = {};
      if (!daily[r.record_date][tk]) daily[r.record_date][tk] = new Set();
      daily[r.record_date][tk].add(r.employee_id);
    }

    const dayKeys = Object.keys(daily).sort();
    const t1 = dayKeys.map((d) => daily[d].team_1?.size || 0);
    const t2 = dayKeys.map((d) => daily[d].team_2?.size || 0);

    const result = {
      team_1: median(t1),
      team_2: median(t2),
      daysUsed: dayKeys.length,
      perDay: dayKeys.reduce((acc, d) => {
        acc[d] = { team_1: daily[d].team_1?.size || 0, team_2: daily[d].team_2?.size || 0 };
        return acc;
      }, {}),
    };

    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});