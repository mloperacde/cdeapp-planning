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
      detalle_ausencias: detalleAusencias
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
      detalle_ausencias: [detalleAusencia]
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
      abs.absence_type_id && protectionTypeIds.has(abs.absence_type_id)
    );

    console.log(`Recalculando protección para ${protectionAbsences.length} ausencias relevantes...`);

    // Procesar secuencialmente pero sin sync individual
    for (const absence of protectionAbsences) {
      const absenceType = typeById.get(absence.absence_type_id);
      if (!absenceType) continue;

      const employeeVacations = vacationAbsencesByEmployee.get(absence.employee_id) || [];

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

  await syncEmployeeVacationProtection(employeeId);
}
