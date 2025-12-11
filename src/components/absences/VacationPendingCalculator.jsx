import { base44 } from "@/api/base44Client";
import { eachDayOfInterval, isWeekend, format } from "date-fns";

export async function calculateVacationPendingBalance(absence, absenceType, vacations, holidays) {
  // Solo calcular si el tipo NO consume vacaciones
  if (!absenceType?.no_consume_vacaciones) {
    return null;
  }

  // Si la ausencia no tiene fecha de fin definida, usar hoy
  const absenceStart = new Date(absence.fecha_inicio);
  let absenceEnd;
  
  if (absence.fecha_fin_desconocida) {
    absenceEnd = new Date(); // Calcular hasta hoy
  } else if (absence.fecha_fin) {
    absenceEnd = new Date(absence.fecha_fin);
  } else {
    return null; // Should not happen if data is correct
  }
  const year = absenceStart.getFullYear();

  // Obtener todos los días del rango de ausencia
  const absenceDays = eachDayOfInterval({ start: absenceStart, end: absenceEnd });

  let diasCoincidentes = 0;
  const periodosVacaciones = [];

  // Verificar cada período de vacaciones
  for (const vacation of vacations) {
    const vacStart = new Date(vacation.start_date);
    const vacEnd = new Date(vacation.end_date);

    // Solo considerar si las vacaciones son del mismo año
    if (vacStart.getFullYear() !== year && vacEnd.getFullYear() !== year) {
      continue;
    }

    // Verificar si la ausencia se solapa con este período de vacaciones
    const overlap = absenceDays.filter(day => {
      return day >= vacStart && day <= vacEnd && !isWeekend(day);
    });

    if (overlap.length > 0) {
      diasCoincidentes += overlap.length;
      periodosVacaciones.push({
        vacation_id: vacation.id,
        nombre: vacation.nombre,
        dias: overlap.length
      });
    }
  }

  if (diasCoincidentes === 0) {
    return null;
  }

  // Buscar o crear el balance para este empleado y año
  const balances = await base44.entities.VacationPendingBalance.filter({
    employee_id: absence.employee_id,
    anio: year
  });

  let balance = balances[0];

  const detalleAusencia = {
    absence_id: absence.id,
    tipo_ausencia: absence.tipo,
    fecha_inicio: format(absenceStart, 'yyyy-MM-dd'),
    fecha_fin: format(absenceEnd, 'yyyy-MM-dd'),
    dias_coincidentes: diasCoincidentes,
    periodos_vacaciones: periodosVacaciones
  };

  if (balance) {
    // Actualizar balance existente
    const detalleAusencias = balance.detalle_ausencias || [];
    
    // Verificar si ya existe esta ausencia en el detalle
    const existingIndex = detalleAusencias.findIndex(d => d.absence_id === absence.id);
    
    if (existingIndex >= 0) {
      // Actualizar ausencia existente
      detalleAusencias[existingIndex] = detalleAusencia;
    } else {
      // Añadir nueva ausencia
      detalleAusencias.push(detalleAusencia);
    }

    // Recalcular total de días pendientes
    const totalDiasPendientes = detalleAusencias.reduce((sum, d) => sum + d.dias_coincidentes, 0);
    const diasDisponibles = totalDiasPendientes - (balance.dias_consumidos || 0);

    await base44.entities.VacationPendingBalance.update(balance.id, {
      dias_pendientes: totalDiasPendientes,
      dias_disponibles: diasDisponibles,
      detalle_ausencias: detalleAusencias
    });

    return { ...balance, dias_pendientes: totalDiasPendientes, dias_disponibles: diasDisponibles };
  } else {
    // Crear nuevo balance
    const newBalance = await base44.entities.VacationPendingBalance.create({
      employee_id: absence.employee_id,
      anio: year,
      dias_pendientes: diasCoincidentes,
      dias_consumidos: 0,
      dias_disponibles: diasCoincidentes,
      detalle_ausencias: [detalleAusencia]
    });

    return newBalance;
  }
}

export async function removeAbsenceFromBalance(absenceId, employeeId, year) {
  const balances = await base44.entities.VacationPendingBalance.filter({
    employee_id: employeeId,
    anio: year
  });

  if (balances.length === 0) return;

  const balance = balances[0];
  const detalleAusencias = (balance.detalle_ausencias || []).filter(d => d.absence_id !== absenceId);

  // Recalcular total
  const totalDiasPendientes = detalleAusencias.reduce((sum, d) => sum + d.dias_coincidentes, 0);
  const diasDisponibles = totalDiasPendientes - (balance.dias_consumidos || 0);

  if (detalleAusencias.length === 0) {
    // Si no quedan ausencias, eliminar el balance
    await base44.entities.VacationPendingBalance.delete(balance.id);
  } else {
    // Actualizar balance
    await base44.entities.VacationPendingBalance.update(balance.id, {
      dias_pendientes: totalDiasPendientes,
      dias_disponibles: diasDisponibles,
      detalle_ausencias: detalleAusencias
    });
  }
}