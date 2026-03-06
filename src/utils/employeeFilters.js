/**
 * Utility functions for filtering employees based on business rules.
 * Centralizes logic for identifying production operators and excluding leadership roles.
 */

export const normalize = (str) =>
    str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  
/**
 * Determines if an employee is a Production Operator based on their role (puesto).
 * Implements strict whitelist:
 * - Responsable de linea
 * - Segunda de linea
 * - Operaria/o de linea
 * - Tecnico de proceso
 * 
 * Explicitly excludes:
 * - Jefe de Equipo
 * - Jefe de Turno
 * 
 * @param {Object} emp - Employee object from Master Database
 * @returns {boolean} - True if employee is a valid production operator
 */
export const isProductionOperator = (emp) => {
    if (!emp) return false;

    // Check 1: Must be active (Alta)
    // Note: Some contexts might want to include inactive for historical data, 
    // but for "Availability" we usually mean active. 
    // However, the caller might have already filtered by status. 
    // Let's include status check here for safety as "Availability" implies currently working.
    if ((emp.estado_empleado || "Alta") !== "Alta") return false;

    // Check 2: Department (Optional, but safer to check)
    // User said "aunque pertenezcan al departamento de produccion", implying we must check role regardless of department being correct.
    // But let's ensure they are indeed in production context if possible.
    // Actually, user said "count available operators... exclude bosses... even if they belong to production".
    // So if someone has the role "Operario de linea" but is in "Maintenance", should they count? Probably not.
    const dept = normalize(emp.departamento);
    const isProduction = dept.includes("produccion") || dept.includes("production") || dept.includes("fabricacion") || dept.includes("operaciones");
    
    if (!isProduction) return false;

    // Check 3: Role Whitelist
    const role = normalize(emp.puesto);
    if (!role) return false;

    // Explicit exclusions (redundant with whitelist but good for documentation/safety)
    // STRICT: Exclude Shift Leaders and Team Leaders
    if (role.includes("jefe") && role.includes("turno")) return false;
    if (role.includes("jefe") && role.includes("equipo")) return false;
    if (role.includes("jefe")) return false; 
    
    if (role.includes("responsable") && role.includes("turno")) return false;

    // Whitelist matches
    if (role.includes("responsable") && role.includes("linea")) return true;
    if (role.includes("segunda") && role.includes("linea")) return true;
    
    // Handles "Operaria/o de linea", "Operario de linea", "Operaria de linea"
    if (role.includes("operari") && role.includes("linea")) return true;
    
    if (role.includes("tecnico") && role.includes("proceso")) return true;

    return false;
};
