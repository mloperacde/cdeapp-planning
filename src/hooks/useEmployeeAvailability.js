import { useMemo } from 'react';
import { format, startOfWeek, isSameDay } from 'date-fns';

/**
 * Hook to calculate employee availability statistics based on a single source of truth.
 * Centralizes logic for:
 * - Active Employees filtering
 * - Department/Team filtering
 * - Fixed Shift handling (Mañana/Tarde)
 * - Absence checking (robust date comparison)
 * 
 * @param {Object} params
 * @param {Array} params.employees - List of all employees (Master DB)
 * @param {Array} params.absences - List of all active/relevant absences
 * @param {Array} params.teams - List of teams
 * @param {Array} params.schedules - List of team schedules
 * @param {string|Date} params.date - Selected date for calculation
 * @param {string} params.shift - Selected shift (e.g., "Mañana", "Tarde")
 * @param {string} params.teamKey - Selected team key (optional)
 * @param {string} params.department - Target department (default: "Producción")
 */
export function useEmployeeAvailability({
  employees = [],
  absences = [],
  teams = [],
  schedules = [],
  date = new Date(),
  shift = "Mañana",
  teamKey = null,
  department = "Producción"
}) {
  
  // Normalization helper
  const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

  // 1. Resolve Target Team & Shift Context
  const targetDate = new Date(date);
  targetDate.setHours(12, 0, 0, 0); // Noon to avoid TZ issues
  
  const currentShift = normalize(shift);
  const isMorning = currentShift.includes("manana") || currentShift.includes("t1");
  const isAfternoon = currentShift.includes("tarde") || currentShift.includes("t2");
  
  const targetTeamObj = teamKey ? teams.find(t => t.team_key === teamKey) : null;
  const targetTeamName = targetTeamObj ? normalize(targetTeamObj.team_name) : null;
  
  // 2. Filter Relevant Employees (Single Source of Truth)
  const stats = useMemo(() => {
    let total = 0;
    let available = 0;
    let absent = 0;
    const availableList = [];
    const absentList = [];
    const absentDetails = [];

    // Filter by Department and Active Status first
    const deptEmployees = employees.filter(e => {
        if ((e.estado_empleado || "Alta") !== "Alta") return false;
        
        const dept = normalize(e.departamento);
        // Robust check for department
        const targetDept = normalize(department);
        if (targetDept === "produccion") {
            return dept.includes("produccion") || dept.includes("production") || dept.includes("operaciones");
        }
        return dept.includes(targetDept);
    });

    deptEmployees.forEach(emp => {
        // 3. Shift/Team Assignment Logic
        // Determine if employee "belongs" to the current counting context
        
        const empTeam = normalize(emp.equipo);
        const tipoTurno = normalize(emp.tipo_turno);
        
        const isFixedMorning = tipoTurno === "fijo manana";
        const isFixedAfternoon = tipoTurno === "fijo tarde";
        
        let shouldCount = false;

        // If filtering by specific team (e.g. Planning for Team A)
        if (targetTeamName) {
            const isTeamMember = empTeam === targetTeamName;
            
            // Logic:
            // - If Fixed Shift matching current shift: ALWAYS INCLUDE (even if team differs, they work this shift)
            // - If Team Member: INCLUDE unless they have Fixed Shift for the OTHER shift
            
            if (isMorning && isFixedMorning) shouldCount = true;
            else if (isAfternoon && isFixedAfternoon) shouldCount = true;
            else if (isTeamMember) {
                // Exclude if they are fixed for the OTHER shift
                if (isMorning && isFixedAfternoon) shouldCount = false;
                else if (isAfternoon && isFixedMorning) shouldCount = false;
                else shouldCount = true;
            }
        } else {
            // If no specific team selected (Global View), just count everyone in department?
            // Usually we want to know available for the SHIFT
            if (isMorning) {
                // Include all Rotating teams assigned to Morning + Fixed Morning
                // (This requires knowing which teams are on Morning, complex without schedule)
                // Fallback: If no teamKey, we might return all active in dept
                shouldCount = true; 
            } else if (isAfternoon) {
                shouldCount = true;
            } else {
                shouldCount = true;
            }
        }

        if (!shouldCount) return;

        total++;

        // 4. Availability Check
        // Check 1: Explicit status
        if (normalize(emp.disponibilidad) !== "disponible") {
            absent++;
            absentList.push(emp);
            return;
        }

        // Check 2: Absence Record
        // Find active absence for this date
        const activeAbsence = absences.find(a => {
            if (a.employee_id !== emp.id) return false;
            // Check dates
            const start = new Date(a.fecha_inicio);
            start.setHours(0, 0, 0, 0);
            const checkTime = targetDate.getTime(); // Noon
            
            // Adjust comparison to be robust
            const startLimit = new Date(start); 
            startLimit.setHours(23, 59, 59); // End of start day

            if (a.fecha_fin_desconocida) {
                return targetDate >= start;
            }
            
            const end = new Date(a.fecha_fin);
            end.setHours(23, 59, 59, 999);
            
            return targetDate >= start && targetDate <= end;
        });

        if (activeAbsence) {
            absent++;
            absentList.push(emp);
            absentDetails.push({ employee: emp, absence: activeAbsence });
        } else {
            available++;
            availableList.push(emp);
        }
    });

    return {
        total,
        available,
        absent,
        availableList,
        absentList,
        absentDetails
    };

  }, [employees, absences, targetTeamName, isMorning, isAfternoon, targetDate, department]);

  return stats;
}
