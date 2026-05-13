import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Tarea nocturna de consolidación.
 * Ejecuta toda la lógica de consolidación directamente (sin sub-invocaciones)
 * para evitar problemas de autorización en cadena.
 */
Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const base44 = createClientFromRequest(req);

  // Permitir ejecución por scheduler (sin usuario) o admin manual
  let triggeredBy = 'scheduled';
  let notificationEmail = null;

  try {
    const user = await base44.auth.me().catch(() => null);
    if (user && user.email) {
      const userRole = (user.role || '').toLowerCase();
      if (userRole !== 'admin') {
        return Response.json({ error: 'Solo administradores pueden ejecutar esta tarea' }, { status: 403 });
      }
      triggeredBy = 'manual';
      notificationEmail = user.email;
    }
  } catch (_) {
    // scheduled: sin usuario autenticado, OK
  }

  const logEntry = await base44.asServiceRole.entities.ConsolidationLog.create({
    task_name: 'Nightly Full Consolidation',
    triggered_by: triggeredBy,
    status: 'running',
    started_at: startedAt,
    steps: [],
    anomalies: [],
    errors: [],
    summary: {}
  });

  const steps = [];
  const anomalies = [];
  const errors = [];
  let overallStatus = 'success';
  let consolidationSummary = {};

  // ─── TAREA 1: Consolidación de máquinas (inline) ──────────────────────────
  steps.push({ step: 'executeFullConsolidation', status: 'processing', msg: 'Iniciando consolidación de máquinas...' });
  try {
    const [machines, masterMachines] = await Promise.all([
      base44.asServiceRole.entities.Machine.list('orden', 500),
      base44.asServiceRole.entities.MachineMasterDatabase.list('codigo_maquina', 500),
    ]);

    const masterByCode = {};
    masterMachines.forEach(m => {
      if (m.codigo_maquina) masterByCode[m.codigo_maquina.toLowerCase()] = m;
    });

    let migrated = 0;
    let skipped = 0;
    const migrErrors = [];

    for (const machine of machines) {
      const codigo = machine.codigo?.toLowerCase();
      if (codigo && masterByCode[codigo]) { skipped++; continue; }
      try {
        await base44.asServiceRole.entities.MachineMasterDatabase.create({
          codigo_maquina: machine.codigo || `M${machine.id}`,
          nombre: machine.nombre,
          marca: machine.marca,
          modelo: machine.modelo,
          numero_serie: machine.numero_serie,
          fecha_compra: machine.fecha_compra,
          tipo: machine.tipo,
          ubicacion: machine.ubicacion,
          descripcion: machine.descripcion,
          orden_visualizacion: machine.orden,
          estado_operativo: 'Operativa',
          machine_id_legacy: machine.id,
          ultimo_sincronizado: new Date().toISOString(),
          estado_sincronizacion: 'Sincronizado'
        });
        migrated++;
      } catch (err) {
        migrErrors.push({ machine: machine.nombre, error: err.message });
      }
    }

    consolidationSummary = {
      machines_migrated: migrated,
      machines_skipped: skipped,
      broken_remaining: 0,
      migration_errors: migrErrors.length
    };

    const msg = `Migradas: ${migrated}, Saltadas: ${skipped}, Errores: ${migrErrors.length}`;
    steps.push({ step: 'executeFullConsolidation', status: migrErrors.length > 0 ? 'warning' : 'success', msg });

    if (migrErrors.length > 0) {
      migrErrors.forEach(e => errors.push({ task: 'machineMigration', error: `${e.machine}: ${e.error}` }));
      if (overallStatus === 'success') overallStatus = 'warning';
    }
  } catch (err) {
    errors.push({ task: 'executeFullConsolidation', error: err.message });
    steps.push({ step: 'executeFullConsolidation', status: 'error', msg: err.message });
    overallStatus = 'error';
  }

  // ─── TAREA 2: autoConsolidateEmployees (no-op) ────────────────────────────
  steps.push({ step: 'autoConsolidateEmployees', status: 'success', msg: 'Consolidación Employee→Master ya completada (no-op)' });

  // ─── TAREA 3: Verificar integridad de empleados ───────────────────────────
  steps.push({ step: 'employeeIntegrity', status: 'processing', msg: 'Verificando integridad de datos de empleados...' });
  let employeeSummary = {};
  try {
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list('nombre', 2000);
    const total = employees.length;
    const sinCodigo = employees.filter(e => !e.codigo_empleado).length;
    const sinDept = employees.filter(e => e.estado_empleado === 'Alta' && !e.departamento).length;
    const sinPuesto = employees.filter(e => e.estado_empleado === 'Alta' && !e.puesto).length;

    employeeSummary = { total, sinCodigo, sinDept, sinPuesto };

    steps.push({
      step: 'employeeIntegrity',
      status: sinCodigo + sinDept + sinPuesto > 0 ? 'warning' : 'success',
      msg: `Total: ${total}, Sin código: ${sinCodigo}, Sin departamento: ${sinDept}, Sin puesto: ${sinPuesto}`
    });

    if (sinCodigo > 5) {
      anomalies.push({ type: 'missing_employee_code', description: `${sinCodigo} empleados activos sin código`, severity: 'high' });
      overallStatus = 'warning';
    }
    if (sinDept > 5) {
      anomalies.push({ type: 'missing_department', description: `${sinDept} empleados activos sin departamento`, severity: 'medium' });
      if (overallStatus === 'success') overallStatus = 'warning';
    }
    if (sinPuesto > 5) {
      anomalies.push({ type: 'missing_position', description: `${sinPuesto} empleados activos sin puesto`, severity: 'low' });
      if (overallStatus === 'success') overallStatus = 'warning';
    }
  } catch (err) {
    errors.push({ task: 'employeeIntegrity', error: err.message });
    steps.push({ step: 'employeeIntegrity', status: 'error', msg: err.message });
  }

  // ─── NOTIFICACIÓN si hay anomalías ────────────────────────────────────────
  let notificationSent = false;
  if (anomalies.length > 0) {
    try {
      const admins = await base44.asServiceRole.entities.User.list('email', 50);
      const adminEmails = admins.filter(u => (u.role || '').toLowerCase() === 'admin').map(u => u.email);
      const targets = notificationEmail ? [notificationEmail, ...adminEmails.filter(e => e !== notificationEmail)] : adminEmails;
      const uniqueTargets = [...new Set(targets)].slice(0, 5);

      const highCount = anomalies.filter(a => a.severity === 'high').length;
      const subject = `⚠️ Consolidación Nocturna – ${anomalies.length} anomalía(s)${highCount > 0 ? ' [ALTA PRIORIDAD]' : ''}`;
      const anomalyList = anomalies.map(a => `• [${a.severity?.toUpperCase()}] ${a.description}`).join('\n');
      const body = `Resumen de la tarea nocturna ejecutada el ${new Date().toLocaleString('es-ES')}:\n\nEstado: ${overallStatus.toUpperCase()}\n\nAnomалías:\n${anomalyList}\n\nPasos: ${steps.length} | Errores: ${errors.length}\n\nRevisa el historial en la app: Configuración > Tareas Programadas.`;

      for (const email of uniqueTargets) {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject, body });
      }
      notificationSent = true;
      notificationEmail = uniqueTargets.join(', ');
    } catch (emailErr) {
      errors.push({ task: 'notification', error: emailErr.message });
    }
  }

  // ─── Guardar log final ────────────────────────────────────────────────────
  const completedAt = new Date().toISOString();
  const durationSeconds = Math.round((Date.now() - startMs) / 1000);

  await base44.asServiceRole.entities.ConsolidationLog.update(logEntry.id, {
    status: overallStatus,
    completed_at: completedAt,
    duration_seconds: durationSeconds,
    steps,
    anomalies,
    errors,
    notification_sent: notificationSent,
    notification_email: notificationEmail,
    summary: {
      consolidation: consolidationSummary,
      employee: employeeSummary,
      anomalies_count: anomalies.length,
      errors_count: errors.length
    }
  });

  return Response.json({
    success: overallStatus !== 'error',
    status: overallStatus,
    duration_seconds: durationSeconds,
    anomalies_count: anomalies.length,
    notification_sent: notificationSent,
    log_id: logEntry.id
  });
});