import { base44 } from "@/api/base44Client";
import { cleanLockerNumber } from "@/utils";

/**
 * Devuelve la asignación de taquilla de un empleado buscando sobre una lista ya cargada.
 */
export function findLockerAssignment(assignments, employeeId) {
  if (!employeeId) return null;
  return (assignments || []).find(a => String(a.employee_id) === String(employeeId)) || null;
}

/**
 * Devuelve otra asignación que ya ocupa ese vestuario + número (o null si está libre).
 */
export function findLockerConflict(assignments, employeeId, vestuario, numero) {
  const vest = vestuario || "";
  const num = cleanLockerNumber(numero);
  if (!vest || !num) return null;
  return (assignments || []).find(a =>
    String(a.employee_id) !== String(employeeId) &&
    a.requiere_taquilla !== false &&
    (a.vestuario || "") === vest &&
    cleanLockerNumber(a.numero_taquilla_actual) === num
  ) || null;
}

/**
 * Sincroniza la taquilla configurada en la ficha de empleado hacia el módulo
 * de Vestuarios y Taquillas (entidad LockerAssignment), validando duplicados
 * y guardando el historial de cambios.
 */
export async function syncLockerAssignment({ employeeId, vestuario, numeroTaquilla, motivo = "Actualización desde ficha de empleado" }) {
  if (!employeeId) return null;

  const vest = vestuario || "";
  const numero = cleanLockerNumber(numeroTaquilla);
  const assignments = await base44.entities.LockerAssignment.list();
  const existing = findLockerAssignment(assignments, employeeId);

  const conflicto = findLockerConflict(assignments, employeeId, vest, numero);
  if (conflicto) {
    throw new Error(`La taquilla ${numero} de ${vest} ya está asignada a otro empleado`);
  }

  // Nada configurado y sin asignación previa: no hay nada que sincronizar
  if (!existing && !vest && !numero) return null;

  const sinCambios = existing &&
    (existing.vestuario || "") === vest &&
    cleanLockerNumber(existing.numero_taquilla_actual) === numero;
  if (sinCambios) return existing;

  const requiere = Boolean(vest && numero);
  const now = new Date().toISOString();

  const payload = {
    employee_id: employeeId,
    requiere_taquilla: requiere,
    vestuario: requiere ? vest : "",
    numero_taquilla_actual: requiere ? numero : "",
    numero_taquilla_nuevo: "",
    fecha_asignacion: existing?.fecha_asignacion || now,
    historial_cambios: [
      ...(existing?.historial_cambios || []),
      {
        fecha: now,
        vestuario_anterior: existing?.vestuario || "",
        taquilla_anterior: existing?.numero_taquilla_actual || "",
        vestuario_nuevo: requiere ? vest : "",
        taquilla_nueva: requiere ? numero : "",
        motivo
      }
    ]
  };

  return existing
    ? await base44.entities.LockerAssignment.update(existing.id, payload)
    : await base44.entities.LockerAssignment.create(payload);
}