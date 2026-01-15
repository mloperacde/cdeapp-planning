export function getEligibleProcessesForMachine(machineId, machineProcesses, processes) {
  const activeProcessIds = new Set(
    machineProcesses
      .filter(mp => mp.machine_id === machineId && mp.activo)
      .map(mp => mp.process_id)
  );
  return processes.filter(p => activeProcessIds.has(p.id) && p.activo);
}

export function getEligibleMachinesForProcess(processId, machines, machineProcesses) {
  const activeMachineIds = new Set(
    machineProcesses
      .filter(mp => mp.process_id === processId && mp.activo)
      .map(mp => mp.machine_id)
  );
  return machines.filter(m => activeMachineIds.has(m.id));
}

export function getEmployeeDefaultMachineExperience(employee, employeeMachineSkills = []) {
  const skills = employeeMachineSkills
    .filter(s => s.employee_id === employee.id)
    .sort((a, b) => (a.orden_preferencia || 999) - (b.orden_preferencia || 999))
    .map(s => s.machine_id);
  if (skills.length > 0) return skills;
  const legacy = [];
  for (let i = 1; i <= 10; i++) {
    const v = employee[`maquina_${i}`];
    if (v) legacy.push(v);
  }
  return legacy;
}

export function isEmployeeAvailableOnDate(employee, absences = [], dateISO) {
  if (employee.estado_empleado !== 'Alta') return false;
  if (employee.incluir_en_planning === false) return false;
  const d = new Date(dateISO + 'T00:00:00');
  const hasActiveAbsence = absences.some(abs => {
    if (abs.employee_id !== employee.id) return false;
    if (abs.estado_aprobacion !== 'Aprobada') return false;
    const start = new Date(abs.fecha_inicio);
    const end = abs.fecha_fin_desconocida ? null : new Date(abs.fecha_fin);
    if (abs.fecha_fin_desconocida) return d >= start;
    return end && d >= start && d <= end;
  });
  return !hasActiveAbsence;
}

export function getAvailability(employees = [], absences = [], dateISO) {
  const disponibles = [];
  const ausentes = [];
  const detallesAusentes = [];
  employees.forEach(emp => {
    const ok = isEmployeeAvailableOnDate(emp, absences, dateISO);
    if (ok) {
      disponibles.push(emp);
    } else {
      ausentes.push(emp);
      const a = absences.find(x => x.employee_id === emp.id && x.estado_aprobacion === 'Aprobada');
      if (a) detallesAusentes.push({ employee: emp, ausencia: a });
    }
  });
  const total = employees.length || 1;
  const porcentajeDisponible = Math.round((disponibles.length / total) * 100);
  return {
    totalEmpleados: employees.length,
    disponibles: disponibles.length,
    ausentes: ausentes.length,
    porcentajeDisponible,
    empleadosDisponibles: disponibles,
    empleadosAusentes: ausentes,
    detalleAusentes: detallesAusentes
  };
}
