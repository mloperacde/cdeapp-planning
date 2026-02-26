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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function addDays(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function ausenciaActivaEnFecha(absence: any, fecha: string) {
  if (!absence?.fecha_inicio) return false;

  const fechaStr = String(fecha).slice(0, 10);
  const inicioStr = String(absence.fecha_inicio).slice(0, 10);
  if (!inicioStr) return false;

  // Solo consideramos ausencias aprobadas
  if (absence.estado_aprobacion !== "Aprobada") return false;

  // Sin fecha fin o fin desconocido -> activa desde inicio en adelante
  if (absence.fecha_fin_desconocida || !absence.fecha_fin) {
    return fechaStr >= inicioStr;
  }

  const finIso = String(absence.fecha_fin);
  const finStr = finIso.slice(0, 10);
  if (!finStr) return fechaStr >= inicioStr;

  // Si la hora de fin es exactamente 00:00, interpretamos el fin como EXCLUSIVO del propio día de fin:
  // es decir, la ausencia cubre hasta el día anterior a finStr.
  // Esto evita marcar como "activa" una ausencia que finaliza a las 00:00 del día auditado.
  const finTime = finIso.includes("T") ? finIso.slice(11, 16) : "";
  const finEffective = finTime === "00:00" ? addDays(finStr, -1) : finStr;

  return fechaStr >= inicioStr && fechaStr <= finEffective;
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

    const excludedIds = new Set(["999", "998", "997"]);

    const isExcludedEmployee = (m: any) => {
      if (!m) return false;
      const codigo = m.codigo_empleado != null ? String(m.codigo_empleado).trim() : "";
      const internalId = m.id != null ? String(m.id).trim() : "";
      return excludedIds.has(codigo) || excludedIds.has(internalId);
    };

    const filteredMasterEmployees = masterEmployees.filter((m: any) => !isExcludedEmployee(m));

    const filteredRawRecords = rawRecords.filter((r: any) => {
      const id = r?.employee_id != null ? String(r.employee_id).trim() : "";
      if (!id) return true;
      return !excludedIds.has(id);
    });

    // Mapa team_key → turno para la semana: { "team_1": "Mañana", "team_2": "Tarde" }
    const teamScheduleMap: Record<string, string> = {};
    for (const ws of weekSchedules) {
      teamScheduleMap[ws.team_key] = ws.turno;
    }

    const masterMapByCodigo: Record<string, any> = {};
    const masterMapById: Record<string, any> = {};
    for (const emp of filteredMasterEmployees) {
      if (emp.codigo_empleado) masterMapByCodigo[String(emp.codigo_empleado)] = emp;
      if (emp.id != null) masterMapById[String(emp.id)] = emp;
    }

    const masterIdToCodigo: Record<string, string> = {};
    for (const m of filteredMasterEmployees) {
      if (m.id && m.codigo_empleado) masterIdToCodigo[m.id] = String(m.codigo_empleado);
    }

    // Mapas de ausencias activas en la fecha: por id y por código
    const ausenciasByCodigo: Record<string, any> = {};
    const ausenciasById: Record<string, any> = {};
    for (const a of ausencias) {
      if (!a.employee_id) continue;
      if (!ausenciaActivaEnFecha(a, date)) continue;
      const codigo = masterIdToCodigo[a.employee_id];
      const normalizedCodigo = codigo != null ? String(codigo).trim() : "";
      if (normalizedCodigo && !excludedIds.has(normalizedCodigo)) ausenciasByCodigo[normalizedCodigo] = a;
      ausenciasById[String(a.employee_id)] = a;
    }

    const fichajesMap: Record<string, { employee_id: string; employee_name: string; registros: any[] }> = {};
    for (const r of filteredRawRecords) {
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
      const master =
        masterMapById[emp.employee_id] ||
        masterMapByCodigo[emp.employee_id] ||
        null;

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
      const ausencia =
        ausenciasById[master?.id != null ? String(master.id) : ""] ||
        ausenciasByCodigo[emp.employee_id] ||
        null;
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
    const fichajesIds = new Set(Object.keys(fichajesMap));
    const sinRegistro = filteredMasterEmployees
      .filter((m: any) => {
        const codigo = m.codigo_empleado != null ? String(m.codigo_empleado).trim() : "";
        const internalId = m.id != null ? String(m.id).trim() : "";
        if (excludedIds.has(codigo) || excludedIds.has(internalId)) return false;
        if (!codigo || m.estado_empleado !== "Alta") return false;
        if (fichajesIds.has(codigo)) return false;
        const { horaEntrada } = getHorarioEsperado(m, teamScheduleMap);
        if (!horaEntrada) return false;

        // SI ESTAMOS EN EL DÍA DE HOY:
        // No marcar como ausente si su turno empieza en el futuro
        if (esHoy) {
          const now = new Date();
          // Añadimos 30 min de margen: si falta menos de 30 min para entrar, ya podría estar llegando.
          // Si faltan horas, no debería salir en la lista de ausentes todavía.
          // Convertir horaEntrada (HH:mm) a minutos
          const [h, min] = horaEntrada.split(':').map(Number);
          const entradaMin = h * 60 + min;
          // Hora actual en minutos, ajustada a zona horaria del usuario (Madrid por defecto)
          // La función new Date() en Deno Deploy usa UTC por defecto. Necesitamos hora local.
          // Usamos una aproximación segura sumando offset o Intl.DateTimeFormat
          
          const madridDateStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" });
          const madridDate = new Date(madridDateStr);
          const nowMin = madridDate.getHours() * 60 + madridDate.getMinutes();

          // Si la hora actual es anterior a la hora de entrada + margen de cortesía (ej. 30 min), NO es ausente todavía.
          // Ejemplo: Entrada a las 14:00. Son las 13:50. No es ausente.
          // Ejemplo: Entrada a las 14:00. Son las 14:15. Es ausente (si no ha fichado).
          // Damos 30 minutos de margen DESPUÉS de la hora de entrada para considerarlo definitivamente ausente en el reporte en tiempo real
          const margenCortesía = 30; 
          
          if (nowMin < (entradaMin + margenCortesía)) return false;
        }

        return true;
      })
      .map((m: any) => {
        const { horaEntrada, turnoReal } = getHorarioEsperado(m, teamScheduleMap);
        const ausencia =
          ausenciasById[String(m.id)] ||
          (m.codigo_empleado != null ? ausenciasByCodigo[String(m.codigo_empleado)] : null) ||
          null;
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
