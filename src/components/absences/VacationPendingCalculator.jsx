import { base44 } from "@/api/base44Client";
import { eachDayOfInterval, isWeekend, format } from "date-fns";

export async function syncEmployeeVacationProtection(employeeId, preloadedBalances = null) {
  try {
    let balances;
    
    if (preloadedBalances) {
      balances = preloadedBalances;
    } else {
      // Usar list() con límite alto y ordenación explícita
      balances = await base44.entities.VacationPendingBalance.list('id', 5000);
    }

    const employeeBalances = balances.filter(b => b.employee_id === employeeId);
    const totalDiasDisponibles = employeeBalances.reduce((sum, b) => sum + (b.dias_disponibles || 0), 0);

    console.log(`Sincronizando empleado ${employeeId}: ${totalDiasDisponibles} días encontrados.`);

    await base44.entities.EmployeeMasterDatabase.update(employeeId, {
      dias_vacaciones_proteccion: totalDiasDisponibles
    });
  } catch (error) {
    console.error("Error syncing employee vacation protection:", error);
  }
}

export async function calculateVacationPendingBalance(absence, absenceType, vacations, holidays, employeeVacationAbsences = [], skipSync = false) {
  const noConsumeVacaciones = absenceType?.no_consume_vacaciones ?? true;
  if (!noConsumeVacaciones) {
    return null;
  }

  if (absence && absence.ignore_protection_balance) {
    return null;
  }

  const absenceStart = new Date(absence.fecha_inicio);
  const today = new Date();

  let rawEnd;

  if (absence.fecha_fin) {
    const endDate = new Date(absence.fecha_fin);
    rawEnd = endDate > today ? today : endDate;
  } else {
    rawEnd = today;
  }

  const absenceEnd = rawEnd;
  const year = absenceStart.getFullYear();

  // Preparar conjunto de fechas festivas para búsqueda rápida
  const holidaySet = new Set(holidays.map(h => format(new Date(h.date), 'yyyy-MM-dd')));

  // Obtener todos los días del rango de ausencia
  const absenceDays = eachDayOfInterval({ start: absenceStart, end: absenceEnd });

  let diasCoincidentes = 0;
  const periodosVacaciones = [];

  // Combinar vacaciones globales y ausencias de vacaciones individuales
  const allVacations = [
    ...vacations.map(v => ({ ...v, type: 'global' })),
    ...employeeVacationAbsences.map(v => ({
      id: v.id,
      start_date: v.fecha_inicio,
      end_date: v.fecha_fin || v.fecha_inicio,
      nombre: `Vacaciones Indiv. (${v.tipo || 'Vacaciones'})`,
      type: 'individual'
    }))
  ];

  // Verificar cada período de vacaciones
  for (const vacation of allVacations) {
    // Evitar solapamiento consigo mismo (aunque no debería pasar si noConsumeVacaciones es true)
    if (vacation.type === 'individual' && vacation.id === absence.id) continue;

    const vacStart = new Date(vacation.start_date);
    const vacEnd = new Date(vacation.end_date);

    // Verificar si la ausencia se solapa con este período de vacaciones
    const overlap = absenceDays.filter(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isHoliday = holidaySet.has(dateStr);
      return day >= vacStart && day <= vacEnd && !isWeekend(day) && !isHoliday;
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
    const detalleAusencias = balance.detalle_ausencias || [];
    const existingIndex = detalleAusencias.findIndex(d => d.absence_id === absence.id);
    if (existingIndex >= 0) {
      detalleAusencias[existingIndex] = detalleAusencia;
    } else {
      detalleAusencias.push(detalleAusencia);
    }

    const totalDiasPendientes = detalleAusencias.reduce((sum, d) => sum + d.dias_coincidentes, 0);
    const diasDisponibles = totalDiasPendientes - (balance.dias_consumidos || 0);

    await base44.entities.VacationPendingBalance.update(balance.id, {
      dias_pendientes: totalDiasPendientes,
      dias_disponibles: diasDisponibles,
      detalle_ausencias: detalleAusencias,
      tipo_saldo: balance.tipo_saldo || "proteccion_vacaciones",
    });

    if (!skipSync) {
      await syncEmployeeVacationProtection(absence.employee_id);
    }

    return { ...balance, dias_pendientes: totalDiasPendientes, dias_disponibles: diasDisponibles };
  } else {
    const newBalance = await base44.entities.VacationPendingBalance.create({
      employee_id: absence.employee_id,
      anio: year,
      dias_pendientes: diasCoincidentes,
      dias_consumidos: 0,
      dias_disponibles: diasCoincidentes,
      detalle_ausencias: [detalleAusencia],
      tipo_saldo: "proteccion_vacaciones",
    });

    if (!skipSync) {
      await syncEmployeeVacationProtection(absence.employee_id);
    }

    return newBalance;
  }
}

export async function recalculateVacationPendingBalances() {
  console.log("Iniciando recálculo masivo de vacaciones pendientes...");
  try {
    const [absences, absenceTypes, vacations, holidays] = await Promise.all([
      base44.entities.Absence.list("-fecha_inicio", 5000), // Aumentar límite considerablemente
      base44.entities.AbsenceType.list("orden", 200),
      base44.entities.Vacation.list(),
      base44.entities.Holiday.list()
    ]);

    console.log(`Datos recuperados: ${absences.length} ausencias, ${absenceTypes.length} tipos, ${vacations.length} vacaciones, ${holidays.length} festivos.`);

    const typeById = new Map();
    const vacationTypeIds = new Set();
    const protectionTypeIds = new Set();

    absenceTypes.forEach(type => {
      if (type && type.id) {
        typeById.set(type.id, type);
        
        // Identificar tipos de vacaciones
        const nombreLower = (type.nombre || "").toLowerCase();
        const catLower = (type.categoria_principal || type.categoria || "").toLowerCase();
        if (nombreLower.includes("vacaciones") || catLower.includes("vacaciones")) {
          vacationTypeIds.add(type.id);
        }

        // Identificar tipos que generan protección (no consumen vacaciones)
        // IMPORTANTE: Default a true si es undefined, coincidiendo con la UI
        const noConsume = type.no_consume_vacaciones ?? true;
        if (noConsume) {
          protectionTypeIds.add(type.id);
        }
      }
    });

    // Agrupar ausencias de vacaciones por empleado
    const vacationAbsencesByEmployee = new Map();
    
    for (const abs of absences) {
      if (vacationTypeIds.has(abs.absence_type_id)) {
        const empId = abs.employee_id;
        if (!vacationAbsencesByEmployee.has(empId)) {
          vacationAbsencesByEmployee.set(empId, []);
        }
        vacationAbsencesByEmployee.get(empId).push(abs);
      }
    }

    // Filtrar solo ausencias que pueden generar días pendientes (OPTIMIZACIÓN CLAVE)
    const protectionAbsences = absences.filter(abs => 
      abs.absence_type_id &&
      protectionTypeIds.has(abs.absence_type_id) &&
      !abs.ignore_protection_balance
    );

    console.log(`Recalculando protección para ${protectionAbsences.length} ausencias relevantes...`);

    // Procesar secuencialmente pero sin sync individual
    let processedCount = 0;
    for (const absence of protectionAbsences) {
      const absenceType = typeById.get(absence.absence_type_id);
      if (!absenceType) continue;

      const employeeVacations = vacationAbsencesByEmployee.get(absence.employee_id) || [];
      
      if (processedCount % 10 === 0) {
          console.log(`Procesando ausencia ${absence.id} (${processedCount + 1}/${protectionAbsences.length}). Vacaciones del empleado: ${employeeVacations.length}`);
      }
      processedCount++;

      // SkipSync = true para evitar N llamadas a update de empleado
      await calculateVacationPendingBalance(absence, absenceType, vacations, holidays, employeeVacations, true);
    }

    // Sincronización final masiva: asegurar que todos los saldos se reflejen en las fichas de empleado
    const allBalances = await base44.entities.VacationPendingBalance.list('id', 5000);
    const distinctEmployeeIds = new Set(allBalances.map(b => b.employee_id));
    
    console.log(`Sincronizando balances finales para ${distinctEmployeeIds.size} empleados...`);

    for (const empId of distinctEmployeeIds) {
      if (empId) {
        await syncEmployeeVacationProtection(empId, allBalances);
      }
    }

    console.log("Recálculo completado con éxito.");
    return { success: true, count: protectionAbsences.length };
  } catch (error) {
    console.error("Error crítico en recalculateVacationPendingBalances:", error);
    throw error; // Re-throw para que useMutation capture el error
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
    await base44.entities.VacationPendingBalance.delete(balance.id);
  } else {
    await base44.entities.VacationPendingBalance.update(balance.id, {
      dias_pendientes: totalDiasPendientes,
      dias_disponibles: diasDisponibles,
      detalle_ausencias: detalleAusencias
    });
  }

  try {
    await base44.entities.Absence.update(absenceId, {
      ignore_protection_balance: true
    });
  } catch (error) {
    console.error("Error marcando ausencia para ignorar protección:", error);
  }

  await syncEmployeeVacationProtection(employeeId);
}

export async function consumeVacationPendingForAbsence(absence, holidays, origin = "consumo_automatico_ausencia_vacaciones") {
  if (!absence || !absence.employee_id || !absence.fecha_inicio) return null;

  const start = new Date(absence.fecha_inicio);
  const end = absence.fecha_fin ? new Date(absence.fecha_fin) : start;

  const holidaySet = new Set(holidays.map(h => format(new Date(h.date), "yyyy-MM-dd")));
  const allDays = eachDayOfInterval({ start, end });

  const workingDays = allDays.filter(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    const isHoliday = holidaySet.has(dateStr);
    return !isWeekend(day) && !isHoliday;
  });

  const diasToConsume = workingDays.length;
  if (diasToConsume <= 0) return null;

  const balances = await base44.entities.VacationPendingBalance.filter({
    employee_id: absence.employee_id,
  });

  if (!balances || balances.length === 0) {
    throw new Error("El empleado no tiene saldo de vacaciones pendientes disponible.");
  }

  const protectionBalances = balances.filter(
    (b) => b.tipo_saldo === "proteccion_vacaciones" || !b.tipo_saldo
  );
  const festivoBalances = balances.filter(
    (b) => b.tipo_saldo === "compensacion_festivos"
  );

  const sumDisponibles = (list) => {
    let totalPendientes = 0;
    let totalConsumidos = 0;
    for (const b of list) {
      totalPendientes += b.dias_pendientes || 0;
      totalConsumidos += b.dias_consumidos || 0;
    }
    return totalPendientes - totalConsumidos;
  };

  const disponiblesProteccion = sumDisponibles(protectionBalances);
  const disponiblesFestivos = sumDisponibles(festivoBalances);
  const totalDisponibles = disponiblesProteccion + disponiblesFestivos;

  if (totalDisponibles <= 0) {
    throw new Error("El empleado no tiene saldo de vacaciones pendientes disponible.");
  }

  if (diasToConsume > totalDisponibles) {
    throw new Error(
      `No se pueden registrar vacaciones: saldo disponible ${totalDisponibles} día(s) entre protección y festivos, se necesitan ${diasToConsume}.`
    );
  }

  let employeeBalances;
  if (diasToConsume <= disponiblesProteccion) {
    employeeBalances = [...protectionBalances];
  } else if (diasToConsume <= disponiblesFestivos) {
    employeeBalances = [...festivoBalances];
  } else {
    employeeBalances = [...protectionBalances, ...festivoBalances];
  }

  employeeBalances.sort((a, b) => {
    const yearA = typeof a.anio === "number" ? a.anio : parseInt(a.anio || "0", 10);
    const yearB = typeof b.anio === "number" ? b.anio : parseInt(b.anio || "0", 10);
    return yearA - yearB;
  });

  let remaining = diasToConsume;
  let firstUpdatedBalanceId = null;

  for (const balance of employeeBalances) {
    if (remaining <= 0) break;

    const diasPendientes = balance.dias_pendientes || 0;
    const diasConsumidos = balance.dias_consumidos || 0;
    const disponiblesFila = diasPendientes - diasConsumidos;

    if (disponiblesFila <= 0) continue;

    const toConsume = Math.min(remaining, disponiblesFila);
    const updatedConsumidos = diasConsumidos + toConsume;
    const updatedDisponibles = diasPendientes - updatedConsumidos;

    await base44.entities.VacationPendingBalance.update(balance.id, {
      dias_consumidos: updatedConsumidos,
      dias_disponibles: updatedDisponibles,
    });

    if (!firstUpdatedBalanceId) {
      firstUpdatedBalanceId = balance.id;
    }

    remaining -= toConsume;
  }

  if (firstUpdatedBalanceId) {
    try {
      const target = balances.find(b => b.id === firstUpdatedBalanceId) || null;
      const existing = target && Array.isArray(target.detalle_consumos) ? target.detalle_consumos : [];
      const fechasConcedidas = workingDays.map(d => format(d, "yyyy-MM-dd"));
      const consumoRecord = {
        id: `CONS-AUTO-${absence.employee_id}-${Date.now()}`,
        fecha_registro: new Date().toISOString(),
        dias: diasToConsume,
        fechas_concedidas: fechasConcedidas,
        comentario: absence.motivo || "Consumo automático por ausencia de vacaciones",
        origen: origin,
        absence_id: absence.id,
      };
      await base44.entities.VacationPendingBalance.update(firstUpdatedBalanceId, {
        detalle_consumos: [...existing, consumoRecord],
      });
    } catch {
      // Best effort: si falla guardar detalle, no interrumpimos el flujo principal
    }
  }

  await syncEmployeeVacationProtection(absence.employee_id);

  return { dias_consumidos: diasToConsume };
}

export async function removeVacationPendingConsumptionForAbsence(absenceId, employeeId) {
  if (!absenceId || !employeeId) return;

  const balances = await base44.entities.VacationPendingBalance.filter({
    employee_id: employeeId,
  });

  if (!balances || balances.length === 0) return;

  for (const balance of balances) {
    const detalleConsum = Array.isArray(balance.detalle_consumos) ? balance.detalle_consumos : [];
    const toRemove = detalleConsum.filter(
      c => c.absence_id === absenceId && c.origen === "consumo_automatico_ausencia_vacaciones"
    );

    if (toRemove.length === 0) continue;

    const remaining = detalleConsum.filter(
      c => !(c.absence_id === absenceId && c.origen === "consumo_automatico_ausencia_vacaciones")
    );

    const totalDiasRemove = toRemove.reduce((sum, c) => sum + (c.dias || 0), 0);
    const diasPendientes = balance.dias_pendientes || 0;
    const diasConsumidosOriginal = balance.dias_consumidos || 0;
    const diasConsumidos = Math.max(0, diasConsumidosOriginal - totalDiasRemove);
    const diasDisponibles = diasPendientes - diasConsumidos;

    await base44.entities.VacationPendingBalance.update(balance.id, {
      dias_consumidos: diasConsumidos,
      dias_disponibles: diasDisponibles,
      detalle_consumos: remaining,
    });
  }

  await syncEmployeeVacationProtection(employeeId);
}
