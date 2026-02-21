// @ts-ignore Base44 SDK se resuelve en tiempo de ejecución vía Deno/npm specifier
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

function toMin(t: string | null | undefined) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatMin(min: number | null | undefined) {
  if (min == null || min <= 0) return "—";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

function getHorarioEsperado(
  master: any,
  teamScheduleMap: Record<string, string | undefined>
) {
  if (!master) return { horaEntrada: null, horaFin: null, duracionMin: null, turnoReal: null };
  const tipo = master.tipo_turno;
  let horaEntrada: string | null = null;
  let horaFin: string | null = null;
  let turnoReal: string | null = null;

  if (tipo === "Turno Partido") {
    horaEntrada = master.turno_partido_entrada1 || null;
    horaFin = master.turno_partido_salida2 || null;
    turnoReal = "Partido";
  } else if (tipo === "Fijo Mañana") {
    horaEntrada = master.horario_manana_inicio || "07:00";
    horaFin = master.horario_manana_fin || "15:00";
    turnoReal = "Mañana";
  } else if (tipo === "Fijo Tarde") {
    horaEntrada = master.horario_tarde_inicio || "14:00";
    horaFin = master.horario_tarde_fin || "22:00";
    turnoReal = "Tarde";
  } else if (tipo === "Rotativo") {
    const turnoEquipo = master.team_key ? teamScheduleMap[master.team_key] : null;
    turnoReal = turnoEquipo || null;
    if (turnoEquipo === "Mañana") {
      horaEntrada = master.horario_manana_inicio || "07:00";
      horaFin = master.horario_manana_fin || "15:00";
    } else if (turnoEquipo === "Tarde") {
      horaEntrada = master.horario_tarde_inicio || "14:00";
      horaFin = master.horario_tarde_fin || "22:00";
    }
  }

  let duracionMin: number | null = null;
  if (horaEntrada && horaFin) {
    const inicio = toMin(horaEntrada);
    const fin = toMin(horaFin);
    if (inicio != null && fin != null) {
      duracionMin = fin - inicio;
    }
  }
  return { horaEntrada, horaFin, duracionMin, turnoReal };
}

function detectarIncongruencias(
  sorted: Array<{ direction: string; record_time: string }>
) {
  const issues = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].direction === sorted[i - 1].direction) {
      const tipo = sorted[i].direction === "E" ? "ENTRADA" : "SALIDA";
      issues.push(`Doble ${tipo} consecutiva: ${sorted[i - 1].record_time} y ${sorted[i].record_time}`);
    }
  }
  return issues;
}

function ausenciaActivaEnFecha(absence: any, fecha: string) {
  if (!absence?.fecha_inicio) return false;
  const inicio = new Date(absence.fecha_inicio);
  const fin = absence.fecha_fin_desconocida ? new Date("2099-12-31") : new Date(absence.fecha_fin);
  const d = new Date(fecha);
  return d >= new Date(inicio.toDateString()) && d <= new Date(fin.toDateString());
}

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { date } = await req.json();
    if (!date) return Response.json({ error: "Falta el parámetro date" }, { status: 400 });

    // Determinar si la fecha analizada es hoy (la jornada podría estar en curso)
    const todayStr = new Date().toISOString().split("T")[0];
    const esHoy = date === todayStr;

    // Hora actual UTC+1 (España peninsular, offset mínimo)
    const nowUtc = new Date();
    const nowMinutes = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes() + 60;

    // Calcular el lunes de la semana de la fecha solicitada
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Lun...6=Sab
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + diffToMonday);
    const weekStart = monday.toISOString().split("T")[0];

    // Fetch en paralelo con paginación explícita
    const [rawRecords, masterEmployees, ausencias, configs, weekSchedules] = await Promise.all([
      base44.entities.AttendanceRecord.filter({ record_date: date }, "record_time", 2000),
      base44.entities.EmployeeMasterDatabase.list("nombre", 1000),
      base44.entities.Absence.list("-fecha_inicio", 1000),
      base44.entities.AttendanceConfig.list("nombre_configuracion", 10),
      base44.entities.TeamWeekSchedule.filter({ fecha_inicio_semana: weekStart }, "team_key", 10),
    ]);

    const config = configs.find((c: any) => c.activo) || {};
    const toleranciaEntrada = config.tolerancia_entrada_minutos ?? 10;
    const departamentosEstrictos = config.departamentos_estrictos || [];
    const toleranciaReducida = config.tolerancia_reducida_minutos ?? 5;

    // Mapa team_key → turno para la semana: { "team_1": "Mañana", "team_2": "Tarde" }
    const teamScheduleMap: Record<string, string> = {};
    for (const ws of weekSchedules) {
      teamScheduleMap[ws.team_key] = ws.turno;
    }

    // Mapa codigo_empleado → master
    const masterMapByCodigo: Record<string, any> = {};
    for (const emp of masterEmployees) {
      if (emp.codigo_empleado) masterMapByCodigo[String(emp.codigo_empleado)] = emp;
    }

    // Mapa master.id → codigo_empleado
    const masterIdToCodigo: Record<string, string> = {};
    for (const m of masterEmployees) {
      if (m.id && m.codigo_empleado) masterIdToCodigo[m.id] = String(m.codigo_empleado);
    }

    // ausenciasMap: codigo_empleado → ausencia activa en date
    const ausenciasMap: Record<string, any> = {};
    for (const a of ausencias) {
      if (!a.employee_id) continue;
      if (!ausenciaActivaEnFecha(a, date)) continue;
      const codigo = masterIdToCodigo[a.employee_id];
      if (codigo) ausenciasMap[codigo] = a;
    }

    // Agrupar fichajes por employee_id
    const fichajesMap: Record<string, { employee_id: string; employee_name: string; registros: any[] }> = {};
    for (const r of rawRecords) {
      const id = String(r.employee_id);
      if (!fichajesMap[id]) fichajesMap[id] = { employee_id: id, employee_name: r.employee_name, registros: [] };
      fichajesMap[id].registros.push(r);
    }

    // ── 1. Empleados CON fichaje ──────────────────────────────────────────────
    const rows: any[] = [];
    const noEnMaestra: any[] = [];

    for (const emp of Object.values(fichajesMap) as Array<{ employee_id: string; employee_name: string; registros: any[] }>) {
      const sorted = [...emp.registros].sort((a, b) => a.record_time.localeCompare(b.record_time));
      const primerRegistro = sorted[0];
      const ultimoRegistro = sorted[sorted.length - 1];
      const master = masterMapByCodigo[emp.employee_id] || null;

      if (!master) {
        noEnMaestra.push({ employee_id: emp.employee_id, employee_name: emp.employee_name, totalMarcajes: sorted.length });
        continue;
      }

      const departamento = master.departamento || "—";
      const equipo = master.equipo || "—";
      const tipoTurno = master.tipo_turno || "—";
      const { horaEntrada: horaEsperada, horaFin: horaFinEsperada, duracionMin, turnoReal } = getHorarioEsperado(master, teamScheduleMap);
      const tolerancia = departamentosEstrictos.includes(departamento) ? toleranciaReducida : toleranciaEntrada;

      let retrasoMin = 0;
      let esRetraso = false;
      if (horaEsperada) {
        const entradaReal = toMin(primerRegistro.record_time);
        const entradaEsperada = toMin(horaEsperada);
        if (entradaReal != null && entradaEsperada != null) {
          retrasoMin = Math.max(0, entradaReal - entradaEsperada - tolerancia);
          esRetraso = retrasoMin > 0;
        }
      }

      let presenciaMin = 0;
      if (sorted.length >= 2) {
        const inicio = toMin(primerRegistro.record_time);
        const fin = toMin(ultimoRegistro.record_time);
        if (inicio != null && fin != null) {
          presenciaMin = fin - inicio;
        }
      }

      let incidenciaJornada = null;
      if (duracionMin && presenciaMin > 0 && sorted.length >= 2) {
        const deficit = duracionMin - presenciaMin;
        // Solo marcar jornada incompleta si la jornada ya ha finalizado.
        // Si es el día de hoy, comprobamos si la hora fin esperada ha pasado.
        // Para días pasados, siempre se evalúa.
        const horaFinMin = horaFinEsperada ? toMin(horaFinEsperada) : null;
        const jornadaTerminada = !esHoy || horaFinMin == null || nowMinutes >= horaFinMin;
        if (deficit > tolerancia + 10 && jornadaTerminada) {
          incidenciaJornada = `Jornada incompleta: ${formatMin(presenciaMin)} de ${formatMin(duracionMin)} esperados (faltan ${deficit} min)`;
        }
      }

      const incongruencias = detectarIncongruencias(sorted);
      const ausencia = ausenciasMap[emp.employee_id] || null;
      const alertaPresenciaConAusencia = !!ausencia;

      let estado = "ok";
      if (alertaPresenciaConAusencia) estado = "alerta_ausencia";
      else if (incongruencias.length > 0) estado = "incongruencia";
      else if (esRetraso) estado = "retraso";
      else if (incidenciaJornada) estado = "jornada_incompleta";

      rows.push({
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        departamento,
        equipo,
        tipoTurno,
        horaEsperada,
        horaFinEsperada,
        turnoReal: turnoReal || tipoTurno,
        primerMarcaje: primerRegistro.record_time,
        ultimoMarcaje: ultimoRegistro.record_time,
        totalMarcajes: sorted.length,
        retrasoMin,
        esRetraso,
        presenciaMin,
        duracionEsperadaMin: duracionMin,
        incidenciaJornada,
        incongruencias,
        ausencia,
        alertaPresenciaConAusencia,
        estado,
      });
    }

    // ── 2. Empleados SIN fichaje (ausentes) ──────────────────────────────────
    // Solo se consideran ausentes los empleados cuyo turno REAL esta semana ya debería haber empezado.
    // Empleados rotativos del equipo de Tarde no se marcan como ausentes en la auditoría de Mañana.
    const fichajesIds = new Set(Object.keys(fichajesMap));
    const sinRegistro = masterEmployees
      .filter((m: any) => {
        if (!m.codigo_empleado || m.estado_empleado !== "Alta") return false;
        if (fichajesIds.has(String(m.codigo_empleado))) return false;
        const { horaEntrada, turnoReal } = getHorarioEsperado(m, teamScheduleMap);
        if (!horaEntrada) return false;
        // Si el empleado cubre turno de Tarde esta semana, no se incluye como ausente
        // (su hora de entrada es posterior, no ha debido fichar aún)
        if (turnoReal === "Tarde") return false;
        return true;
      })
      .map((m: any) => {
        const { horaEntrada, turnoReal } = getHorarioEsperado(m, teamScheduleMap);
        const ausencia = ausenciasMap[String(m.codigo_empleado)] || null;
        return {
          id: m.id,
          codigo_empleado: m.codigo_empleado,
          nombre: m.nombre,
          departamento: m.departamento,
          equipo: m.equipo,
          tipo_turno: m.tipo_turno,
          turnoReal: turnoReal || m.tipo_turno,
          horaEntradaEsperada: horaEntrada,
          horario_manana_inicio: m.horario_manana_inicio,
          horario_tarde_inicio: m.horario_tarde_inicio,
          turno_partido_entrada1: m.turno_partido_entrada1,
          ausencia,
          alertaFaltaAusencia: !ausencia,
          ausenciaConfirmada: !!ausencia,
        };
      });

    const sortedRows = rows.sort((a, b) => a.employee_name.localeCompare(b.employee_name));

    return Response.json({
      success: true,
      rows: sortedRows,
      sinRegistro,
      noEnMaestra,
      toleranciaEntrada,
      toleranciaReducida,
      departamentosEstrictos,
      weekStart,
      teamScheduleMap,
    });

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
