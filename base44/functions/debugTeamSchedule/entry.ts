// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, startOfWeek } from 'npm:date-fns';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Obtener parámetros
    const url = new URL(req.url);
    const dateStr = url.searchParams.get('date') || '2026-02-23';
    const shiftStr = url.searchParams.get('shift') || 'Mañana';

    // Lógica de cálculo de semana
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    // Obtener schedules
    const schedules = await base44.asServiceRole.entities.TeamWeekSchedule.list();

    // Simular búsqueda
    const normalize = (str: string) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    const targetShift = normalize(shiftStr);

    const matches = schedules.filter((s: any) => {
      if (s.fecha_inicio_semana !== weekStartStr) return false;
      const turno = normalize(s.turno);
      
      if (targetShift.includes("manana") || targetShift.includes("mañana")) {
        return turno.includes("manana") || turno.includes("mañana") || turno.includes("t1");
      }
      if (targetShift.includes("tarde")) {
        return turno.includes("tarde") || turno.includes("t2");
      }
      if (targetShift.includes("noche")) {
        return turno.includes("noche") || turno.includes("t3");
      }
      return turno === targetShift;
    });

    return Response.json({
        input: { date: dateStr, shift: shiftStr },
        calculation: { weekStartStr, targetShift },
        found_matches: matches,
        all_schedules_sample: schedules.slice(0, 3)
    });

  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});