/**
 * getTeamPresentAverage
 * Calcula el PROMEDIO (media aritmética) de operarios de Producción
 * PRESENTES (fichaje "E") por TURNO (Mañana / Tarde) a partir del histórico
 * de los últimos N días (excluyendo hoy), replicando la lógica del Control
 * de Presencia:
 *   - Fijo Mañana → Mañana
 *   - Fijo Tarde  → Tarde
 *   - Turno Partido → Mañana
 *   - Rotativo → según TeamWeekSchedule de esa semana (team_key → turno)
 *
 * Respuesta: { team_1: <promedio mañana>, team_2: <promedio tarde>,
 *              daysUsed, perDay: { 'YYYY-MM-DD': { team_1, team_2 } } }
 *
 * team_1 = turno Mañana, team_2 = turno Tarde (nombres mantenidos por
 * compatibilidad con el frontend; representan turnos, no equipos rotativos).
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

function mean(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return Math.round((sum / arr.length) * 10) / 10; // 1 decimal
}

// Lunes (00:00) de la semana de una fecha dada
function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Dom..6=Sáb
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
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

    // 1) Empleados de producción → mapa codigo_empleado → { tipo_turno, team_key }
    const allEmployees = [];
    let skip = 0;
    while (skip < 4000) {
      const page = await base44.asServiceRole.entities.EmployeeMasterDatabase.list('-created_date', 1000, skip);
      const items = Array.isArray(page) ? page : (page?.items || []);
      allEmployees.push(...items);
      if (items.length < 1000) break;
      skip += 1000;
    }

    const operators = {}; // codigo_empleado -> { tipo_turno, team_key }
    for (const e of allEmployees) {
      if (!isProductionOperator(e) || !e.codigo_empleado) continue;
      operators[e.codigo_empleado] = {
        tipo_turno: e.tipo_turno || '',
        team_key: e.team_key || '',
      };
    }

    // 2) TeamWeekSchedule (histórico de rotación) — fetch amplio y filtrado en memoria
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(today);
    from.setDate(from.getDate() - HISTORY_DAYS);
    const to = new Date(today.getTime() - 86400000); // ayer

    const allSchedules = [];
    let skipW = 0;
    while (skipW < 2000) {
      const page = await base44.asServiceRole.entities.TeamWeekSchedule.list(
        '-fecha_inicio_semana', 1000, skipW
      );
      const items = Array.isArray(page) ? page : (page?.items || []);
      allSchedules.push(...items);
      if (items.length < 1000) break;
      skipW += 1000;
    }

    // mondayISO -> { team_key: 'Mañana'|'Tarde' }
    // Normaliza la clave a 'YYYY-MM-DD' por si viene como datetime ISO
    const weekShiftMap = {};
    for (const ws of allSchedules) {
      if (!ws.fecha_inicio_semana || !ws.team_key || !ws.turno) continue;
      const key = String(ws.fecha_inicio_semana).split('T')[0];
      if (!weekShiftMap[key]) weekShiftMap[key] = {};
      weekShiftMap[key][ws.team_key] = ws.turno;
    }

    // 3) Fichajes "E" del rango
    const fromISO = from.toISOString().split('T')[0];
    const toISO = to.toISOString().split('T')[0];

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

    // 4) Por día, presentes distintos por turno
    //    codigo -> turno ese día ('manana' | 'tarde' | null)
    function shiftFor(code, dateStr) {
      const op = operators[code];
      if (!op) return null;
      const tt = op.tipo_turno;
      if (tt === 'Fijo Mañana') return 'manana';
      if (tt === 'Fijo Tarde') return 'tarde';
      if (tt === 'Turno Partido') return 'manana';
      if (tt === 'Rotativo' && op.team_key) {
        const m = mondayOf(new Date(dateStr)).toISOString().split('T')[0];
        const map = weekShiftMap[m];
        if (!map) return null;
        const t = map[op.team_key];
        if (t === 'Mañana') return 'manana';
        if (t === 'Tarde') return 'tarde';
        return null;
      }
      return null;
    }

    const daily = {}; // 'YYYY-MM-DD' -> { manana: Set, tarde: Set }
    for (const r of att) {
      if (!r.record_date || !r.employee_id) continue;
      const op = operators[r.employee_id];
      if (!op) continue; // no es operario de producción
      const shift = shiftFor(r.employee_id, r.record_date);
      if (!shift) continue;
      if (!daily[r.record_date]) daily[r.record_date] = { manana: new Set(), tarde: new Set() };
      daily[r.record_date][shift].add(r.employee_id);
    }

    const dayKeys = Object.keys(daily).sort();
    const manana = dayKeys.map((d) => daily[d].manana.size);
    const tarde = dayKeys.map((d) => daily[d].tarde.size);

    const result = {
      team_1: mean(manana), // Promedio presentes turno Mañana
      team_2: mean(tarde),   // Promedio presentes turno Tarde
      daysUsed: dayKeys.length,
      perDay: dayKeys.reduce((acc, d) => {
        acc[d] = { team_1: daily[d].manana.size, team_2: daily[d].tarde.size };
        return acc;
      }, {}),
    };

    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
});