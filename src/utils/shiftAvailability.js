import { normalize, isProductionOperator } from "@/utils/employeeFilters";

/**
 * Calcula el número de operadores disponibles para un turno y equipo concretos.
 * Extraído de DailyProductionPlanningPage para reutilización por turno.
 */
export function computeAvailableOperators(employees, teams, selectedTeam, selectedDate, shift) {
  const teamObj = (teams || []).find(t => t.team_key === selectedTeam);
  if (!teamObj) return 0;

  const targetTeam = normalize(teamObj.team_name);
  const shiftNorm = normalize(shift);
  const isMorningShift = shiftNorm.includes("mañana") || shiftNorm.includes("t1") || shiftNorm === "manana";
  const isAfternoonShift = shiftNorm.includes("tarde") || shiftNorm.includes("t2");

  return (employees || []).filter(e => {
    const isTeamById = e.team_id && String(e.team_id) === String(teamObj.id);
    const isTeamByName = normalize(e.equipo) === targetTeam;
    const tipoTurno = normalize(e.tipo_turno);

    const isFixed = tipoTurno.includes("fijo");
    const isMorningType = tipoTurno.includes("manana") || tipoTurno.includes("mañana") || tipoTurno.includes("t1");
    const isAfternoonType = tipoTurno.includes("tarde") || tipoTurno.includes("t2");

    const isFixedMorning = isFixed && isMorningType;
    const isFixedAfternoon = isFixed && isAfternoonType;

    const matchesShiftContext =
      (isMorningShift && isFixedMorning) ||
      (isAfternoonShift && isFixedAfternoon);

    let shouldInclude = false;
    if (matchesShiftContext) {
      shouldInclude = true;
    } else if (isTeamById || isTeamByName) {
      if (isMorningShift && isFixedAfternoon) shouldInclude = false;
      else if (isAfternoonShift && isFixedMorning) shouldInclude = false;
      else shouldInclude = true;
    }

    if (!shouldInclude) return false;
    if (normalize(e.disponibilidad) !== "disponible") return false;

    const role = normalize(e.puesto);
    if (role.includes("jefe") && role.includes("turno")) return false;
    if (role.includes("jefe") && role.includes("equipo")) return false;

    if (!isProductionOperator(e)) return false;

    if (e.ausencia_inicio) {
      const checkDate = new Date(selectedDate);
      checkDate.setHours(12, 0, 0, 0);
      const checkTime = checkDate.getTime();

      const startDate = new Date(e.ausencia_inicio);
      startDate.setHours(0, 0, 0, 0);
      const startTime = startDate.getTime();

      if (e.ausencia_fin) {
        const endDate = new Date(e.ausencia_fin);
        endDate.setHours(23, 59, 59, 999);
        const endTime = endDate.getTime();
        if (checkTime >= startTime && checkTime <= endTime) return false;
      } else {
        if (checkTime >= startTime) return false;
      }
    }

    return true;
  }).length;
}