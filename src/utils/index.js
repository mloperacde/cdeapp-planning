import { format } from "date-fns";
import { es } from "date-fns/locale";

export function createPageUrl(pageName) {
    return '/' + pageName;
}

export function cleanLockerNumber(lockerNumber) {
    if (lockerNumber === null || lockerNumber === undefined) return "";
    return String(lockerNumber).replace(/['"''‚„]/g, '').trim();
}

export function getEmployeeName(employee) {
    if (!employee) return "Desconocido";
    // Si es un objeto, buscar propiedades
    if (typeof employee === 'object') {
        return employee.nombre || employee.name || employee.full_name || employee.display_name || "Sin Nombre";
    }
    // Si es un string (ID), devolverlo tal cual
    return String(employee);
}



// Helper para formatear fechas consistentemente
export function formatDate(date) {
    if (!date) return "-";
    try {
        return format(new Date(date), "dd/MM/yyyy", { locale: es });
    } catch (e) {
        return "-";
    }
}
