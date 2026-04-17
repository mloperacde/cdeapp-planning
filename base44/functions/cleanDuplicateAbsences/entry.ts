/**
 * cleanDuplicateAbsences - Limpieza de ausencias automáticas duplicadas
 * 
 * Para cada empleado, por cada día, mantiene SOLO la ausencia auto-generada
 * más antigua (la primera registrada) y cancela todas las duplicadas.
 * 
 * Las ausencias manuales (no creadas por shiftAudit) nunca se tocan.
 * Solo admin puede ejecutar esta función.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dry_run = false, fecha = null } = body;

    // Cargar todas las ausencias auto-generadas (identificadas por el marcador en notas)
    const allAbsences = await svc.entities.Absence.list('-created_date', 5000);
    
    const autoAbsences = allAbsences.filter(abs => 
      abs.motivo === 'Ausencia no comunicada - detección automática' ||
      (abs.notas && abs.notas.startsWith('[shiftAudit]'))
    );

    // Si se especificó fecha, filtrar solo esa fecha
    const toProcess = fecha 
      ? autoAbsences.filter(abs => abs.fecha_inicio && abs.fecha_inicio.startsWith(fecha))
      : autoAbsences;

    // Agrupar por employee_id + fecha_inicio_dia
    // Clave: employee_id + YYYY-MM-DD de fecha_inicio
    const grouped = {};
    for (const abs of toProcess) {
      if (!abs.fecha_inicio || !abs.employee_id) continue;
      const dateKey = abs.fecha_inicio.substring(0, 10);
      const key = `${abs.employee_id}::${dateKey}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(abs);
    }

    const stats = {
      grupos_analizados: 0,
      duplicados_encontrados: 0,
      cancelados: 0,
      errores: 0,
      detalle: [],
    };

    for (const [key, absences] of Object.entries(grouped)) {
      stats.grupos_analizados++;
      
      // Filtrar solo las pendientes o activas (no tocar ya canceladas/rechazadas)
      const active = absences.filter(a => 
        a.estado_aprobacion === 'Pendiente' || a.estado_aprobacion === 'Aprobada'
      );

      if (active.length <= 1) continue; // Sin duplicados

      // Ordenar por created_date ASC → mantener la más antigua
      active.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      
      const [keeper, ...duplicates] = active;
      stats.duplicados_encontrados += duplicates.length;

      const [empId, dateStr] = key.split('::');
      stats.detalle.push({
        employee_id: empId,
        fecha: dateStr,
        mantenida: keeper.id,
        canceladas: duplicates.map(d => d.id),
      });

      if (!dry_run) {
        for (const dup of duplicates) {
          try {
            await svc.entities.Absence.update(dup.id, {
              estado_aprobacion: 'Cancelada',
              comentario_aprobacion: `[SISTEMA - cleanDuplicates] Ausencia duplicada cancelada automáticamente. Se mantiene el registro original ${keeper.id} del ${keeper.created_date}.`,
            });
            stats.cancelados++;
            await sleep(200);
          } catch (e) {
            console.error(`Error cancelando ${dup.id}:`, e.message);
            stats.errores++;
          }
        }
      }
    }

    console.log('[cleanDuplicateAbsences] Resultado:', JSON.stringify(stats));

    return Response.json({
      success: true,
      dry_run,
      fecha_filtro: fecha || 'todas',
      total_auto_absences: autoAbsences.length,
      ...stats,
    });

  } catch (error) {
    console.error('[cleanDuplicateAbsences] Error fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});