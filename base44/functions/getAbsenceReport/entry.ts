import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const fmtDate = (d: Date): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

const coversDate = (abs: any, dateStr: string): boolean => {
  if (!abs.fecha_inicio) return false;
  const start = new Date(abs.fecha_inicio);
  const end = (abs.fecha_fin_desconocida || !abs.fecha_fin) ? new Date('2099-12-31') : new Date(abs.fecha_fin);
  const d = new Date(dateStr + 'T12:00:00');
  return start <= d && d <= end;
};

const isMaternityType = (tipo: string): boolean => {
  const t = (tipo || '').toLowerCase();
  return t.includes('maternidad') || t.includes('paternidad') || t.includes('riesgo durante') || t.includes('lactancia') || t.includes('nacimiento');
};

const isMarriageType = (tipo: string): boolean => {
  const t = (tipo || '').toLowerCase();
  return t.includes('matrimonio') || t.includes('boda');
};

const computeAntiguedad = (emp: any, now: Date): string => {
  if (!emp.fecha_alta) return '—';
  const fa = new Date(emp.fecha_alta);
  if (isNaN(fa.getTime())) return '—';
  const years = (now.getTime() - fa.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (years >= 1) return years.toFixed(1) + ' años';
  return Math.max(0, Math.floor(years * 12)) + ' meses';
};

// Cuenta episodios (periodos consecutivos de días ausente) y el episodio más largo
const countEpisodes = (absentDays: string[], holidaySet: Set<string>, globalVacSet: Set<string>, empVac: Set<string>): { episodes: number; longest: number } => {
  if (absentDays.length === 0) return { episodes: 0, longest: 0 };
  const sorted = [...absentDays].sort();
  let episodes = 0;
  let longest = 0;
  let currentLen = 0;
  let prevDate: string | null = null;

  for (const ds of sorted) {
    if (prevDate === null) {
      currentLen = 1;
    } else {
      const prev = new Date(prevDate + 'T12:00:00');
      const curr = new Date(ds + 'T12:00:00');
      let gap = false;
      const check = new Date(prev);
      check.setDate(check.getDate() + 1);
      while (check < curr) {
        const cdow = check.getDay();
        const cds = fmtDate(check);
        if (cdow >= 1 && cdow <= 5 && !holidaySet.has(cds) && !globalVacSet.has(cds) && !empVac.has(cds)) {
          gap = true;
          break;
        }
        check.setDate(check.getDate() + 1);
      }
      if (gap) {
        episodes++;
        if (currentLen > longest) longest = currentLen;
        currentLen = 1;
      } else {
        currentLen++;
      }
    }
    prevDate = ds;
  }
  if (currentLen > 0) {
    episodes++;
    if (currentLen > longest) longest = currentLen;
  }
  return { episodes, longest };
};

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

    const { department } = body;

    const now = new Date();
    const win12Start = new Date(now); win12Start.setFullYear(win12Start.getFullYear() - 1); win12Start.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const winEnd = new Date(now); winEnd.setHours(23, 59, 59, 999);
    const win12StartStr = fmtDate(win12Start);
    const winEndStr = fmtDate(winEnd);

    // Cargar DailyPresence (paginado por cursor de fecha)
    const presenceByEmp: Record<string, Set<string>> = {};
    const datesWithData = new Set<string>();
    let cursorDate = win12StartStr;
    let hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.DailyPresence.filter(
        { record_date: { $gte: cursorDate, $lte: winEndStr } },
        'record_date',
        5000
      );
      for (const r of batch) {
        const empId = String(r.employee_id);
        if (!presenceByEmp[empId]) presenceByEmp[empId] = new Set();
        presenceByEmp[empId].add(r.record_date);
        datesWithData.add(r.record_date);
      }
      if (batch.length < 5000) {
        hasMore = false;
      } else {
        const lastDate = batch[batch.length - 1]?.record_date;
        if (!lastDate || lastDate === cursorDate) { hasMore = false; break; }
        cursorDate = lastDate;
      }
    }
    console.log(`[getAbsenceReport] DailyPresence: ${Object.keys(presenceByEmp).length} empleados, ${datesWithData.size} fechas con datos`);

    // Cargar ausencias formales (no canceladas ni rechazadas)
    const absences = await base44.asServiceRole.entities.Absence.list('-fecha_inicio', 5000);
    const absByEmp: Record<string, any[]> = {};
    for (const a of absences) {
      if (a.estado_aprobacion === 'Cancelada' || a.estado_aprobacion === 'Rechazada') continue;
      const k = String(a.employee_id);
      if (!absByEmp[k]) absByEmp[k] = [];
      absByEmp[k].push(a);
    }

    // Cargar empleados, festivos, vacaciones
    const [employees, holidays, vacations] = await Promise.all([
      base44.asServiceRole.entities.EmployeeMasterDatabase.list('nombre', 2000),
      base44.asServiceRole.entities.Holiday.list('date', 500),
      base44.asServiceRole.entities.Vacation.list('start_date', 500),
    ]);

    const holidaySet = new Set<string>();
    for (const h of holidays) { if (h.date) holidaySet.add(h.date); }

    const globalVacationSet = new Set<string>();
    const employeeVacationMap: Record<string, Set<string>> = {};
    for (const v of vacations) {
      if (!v.start_date || !v.end_date) continue;
      const cur = new Date(v.start_date + 'T00:00:00');
      const vEnd = new Date(v.end_date + 'T00:00:00');
      while (cur <= vEnd) {
        const ds = fmtDate(cur);
        if (v.aplica_todos) {
          globalVacationSet.add(ds);
        } else if (v.employee_ids?.length) {
          for (const eid of v.employee_ids) {
            const eidStr = String(eid);
            if (!employeeVacationMap[eidStr]) employeeVacationMap[eidStr] = new Set();
            employeeVacationMap[eidStr].add(ds);
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Calcular resumen por empleado
    const computeForWindow = (empId: string, winStart: Date, winEnd: Date, fechaAlta?: string) => {
      const empAbs = absByEmp[empId] || [];
      const empAtt = presenceByEmp[empId] || new Set<string>();
      const empVac = employeeVacationMap[empId] || new Set<string>();
      // Si el empleado se incorporó después del inicio de la ventana, empezar desde su fecha de alta
      const effectiveStart = fechaAlta ? new Date(fechaAlta + 'T00:00:00') : null;

      let daysAbsent = 0;
      let hasMaternity = false;
      let hasMarriage = false;
      const typeCounts: Record<string, number> = {};
      const absentDays: string[] = [];

      const cur = new Date(winStart);
      while (cur <= winEnd) {
        // Saltar días anteriores a la fecha de incorporación del empleado
        if (effectiveStart && cur < effectiveStart) {
          cur.setDate(cur.getDate() + 1);
          continue;
        }
        const dow = cur.getDay();
        const ds = fmtDate(cur);
        if (dow >= 1 && dow <= 5 && !holidaySet.has(ds) && !globalVacationSet.has(ds) && !empVac.has(ds)) {
          const hasAttData = datesWithData.has(ds);
          const clockedIn = empAtt.has(ds);
          const empTracked = empAtt.size > 0;
          let isAbsent = false;

          if (hasAttData && empTracked) {
            isAbsent = !clockedIn;
          } else {
            isAbsent = empAbs.some(a => coversDate(a, ds));
          }

          if (isAbsent) {
            daysAbsent++;
            absentDays.push(ds);
            const formalAbs = empAbs.find(a => coversDate(a, ds));
            if (formalAbs) {
              const t = formalAbs.tipo || 'Sin especificar';
              typeCounts[t] = (typeCounts[t] || 0) + 1;
              if (isMaternityType(formalAbs.tipo)) hasMaternity = true;
              if (isMarriageType(formalAbs.tipo)) hasMarriage = true;
            } else {
              typeCounts['Sin registro de presencia'] = (typeCounts['Sin registro de presencia'] || 0) + 1;
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      const { episodes, longest } = countEpisodes(absentDays, holidaySet, globalVacationSet, empVac);
      return { daysAbsent, episodes, longestEpisode: longest, hasMaternity, hasMarriage, typeCounts };
    };

    const result = employees
      .filter(emp => {
        if (emp.estado_empleado !== 'Alta' || emp.sujeto_a_control_horario === false) return false;
        if (department && emp.departamento !== department) return false;
        return true;
      })
      .map(emp => {
        const empId = String(emp.id);
        const r12 = computeForWindow(empId, win12Start, winEnd, emp.fecha_alta);
        const rMonth = computeForWindow(empId, monthStart, winEnd, emp.fecha_alta);
        return {
          empId,
          nombre: emp.nombre || 'Desconocido',
          codigo_empleado: emp.codigo_empleado || '',
          departamento: emp.departamento || '—',
          puesto: emp.puesto || '—',
          antiguedad: computeAntiguedad(emp, now),
          estado_empleado: emp.estado_empleado || 'Alta',
          days12: r12.daysAbsent,
          episodes12: r12.episodes,
          longest12: r12.longestEpisode,
          daysMonth: rMonth.daysAbsent,
          episodesMonth: rMonth.episodes,
          estado: emp.disponibilidad || '—',
          typeCounts: r12.typeCounts,
          hasMaternity: r12.hasMaternity,
          hasMarriage: r12.hasMarriage,
        };
      })
      .sort((a, b) => b.days12 - a.days12);

    return Response.json({
      success: true,
      employees: result,
      meta: {
        datesWithData: datesWithData.size,
        employeesWithPresence: Object.keys(presenceByEmp).length,
        totalEmployees: result.length,
      },
    });
  } catch (error) {
    console.error('[getAbsenceReport] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}