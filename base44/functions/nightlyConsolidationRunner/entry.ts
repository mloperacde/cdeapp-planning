import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Tarea nocturna de consolidación.
 * Ejecuta executeFullConsolidation + autoConsolidateEmployees,
 * detecta anomalías y envía notificación si las hay.
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
      // Llamada manual con usuario autenticado
      const userRole = (user.role || '').toLowerCase();
      if (userRole !== 'admin') {
        return Response.json({ error: 'Solo administradores pueden ejecutar esta tarea' }, { status: 403 });
      }
      triggeredBy = 'manual';
      notificationEmail = user.email;
    }
    // Si user es null o no tiene email → llamada del scheduler, permitir
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

  // ─── TAREA 1: executeFullConsolidation ───────────────────────────────────
  steps.push({ step: 'executeFullConsolidation', status: 'processing', msg: 'Iniciando consolidación de máquinas...' });

  let consolidationSummary = {};
  try {
    const consolidationRes = await base44.asServiceRole.functions.invoke('executeFullConsolidation', {});
    consolidationSummary = consolidationRes?.summary || {};

    const broken = consolidationSummary.broken_remaining || 0;
    const msg = `Migradas: ${consolidationSummary.machines_migrated ?? 0}, Saltadas: ${consolidationSummary.machines_skipped ?? 0}, Refs actualizadas: ${consolidationSummary.references_updated ?? 0}, Huérfanas: ${consolidationSummary.orphaned_removed ?? 0}, Rotas restantes: ${broken}`;
    steps.push({ step: 'executeFullConsolidation', status: 'success', msg });

    if (broken > 0) {
      anomalies.push({
        type: 'broken_references',
        description: `${broken} referencias de máquinas rotas tras consolidación`,
        severity: broken > 10 ? 'high' : 'medium'
      });
      overallStatus = 'warning';
    }
  } catch (err) {
    errors.push({ task: 'executeFullConsolidation', error: err.message });
    steps.push({ step: 'executeFullConsolidation', status: 'error', msg: err.message });
    overallStatus = 'error';
  }

  // ─── TAREA 2: autoConsolidateEmployees ────────────────────────────────────
  steps.push({ step: 'autoConsolidateEmployees', status: 'processing', msg: 'Verificando consolidación de empleados...' });

  let employeeSummary = {};
  try {
    const employeeRes = await base44.asServiceRole.functions.invoke('autoConsolidateEmployees', {});
    employeeSummary = employeeRes || {};
    steps.push({ step: 'autoConsolidateEmployees', status: 'success', msg: employeeSummary.message || 'OK' });
  } catch (err) {
    errors.push({ task: 'autoConsolidateEmployees', error: err.message });
    steps.push({ step: 'autoConsolidateEmployees', status: 'error', msg: err.message });
    if (overallStatus === 'success') overallStatus = 'error';
  }

  // ─── TAREA 3: Verificar integridad de empleados ───────────────────────────
  steps.push({ step: 'employeeIntegrity', status: 'processing', msg: 'Verificando integridad de datos de empleados...' });
  try {
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list('nombre', 2000);
    const total = employees.length;
    const sinCodigo = employees.filter(e => !e.codigo_empleado).length;
    const sinDept = employees.filter(e => e.estado_empleado === 'Alta' && !e.departamento).length;
    const sinPuesto = employees.filter(e => e.estado_empleado === 'Alta' && !e.puesto).length;

    steps.push({
      step: 'employeeIntegrity',
      status: sinCodigo + sinDept + sinPuesto > 0 ? 'warning' : 'success',
      msg: `Total: ${total}, Sin código: ${sinCodigo}, Sin departamento: ${sinDept}, Sin puesto: ${sinPuesto}`
    });

    if (sinCodigo > 5) {
      anomalies.push({ type: 'missing_employee_code', description: `${sinCodigo} empleados activos sin código de empleado`, severity: 'high' });
      overallStatus = 'warning';
    }
    if (sinDept > 5) {
      anomalies.push({ type: 'missing_department', description: `${sinDept} empleados activos sin departamento asignado`, severity: 'medium' });
      if (overallStatus === 'success') overallStatus = 'warning';
    }
    if (sinPuesto > 5) {
      anomalies.push({ type: 'missing_position', description: `${sinPuesto} empleados activos sin puesto asignado`, severity: 'low' });
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
      // Obtener admins para notificar
      const admins = await base44.asServiceRole.entities.User.list('email', 50);
      // Normalizar rol a minúsculas para comparación robusta (Base44 puede devolver "Admin")
      const adminEmails = admins.filter(u => (u.role || '').toLowerCase() === 'admin').map(u => u.email);
      const targets = notificationEmail ? [notificationEmail, ...adminEmails.filter(e => e !== notificationEmail)] : adminEmails;
      const uniqueTargets = [...new Set(targets)].slice(0, 5);

      const highCount = anomalies.filter(a => a.severity === 'high').length;
      const subject = `⚠️ Consolidación Nocturna – ${anomalies.length} anomalía(s) detectada(s)${highCount > 0 ? ' [ALTA PRIORIDAD]' : ''}`;
      const anomalyList = anomalies.map(a => `• [${a.severity?.toUpperCase()}] ${a.description}`).join('\n');
      const body = `Resumen de la tarea nocturna ejecutada el ${new Date().toLocaleString('es-ES')}:\n\nEstado: ${overallStatus.toUpperCase()}\n\nAnomалías detectadas:\n${anomalyList}\n\nPasos ejecutados: ${steps.length}\nErrores: ${errors.length}\n\nRevisa el historial completo en la app: Configuración > Tareas Programadas.`;

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