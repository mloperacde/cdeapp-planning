// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Declaraciones para el linter local (no afectan a Deno Deploy)
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Check Team Config for "Turno 2" or "team_2"
    const teams = await base44.asServiceRole.entities.TeamConfig.list();
    const team2 = teams.find((t: any) => 
        t.team_key === 'team_2' || 
        (t.team_name && t.team_name.toLowerCase().includes('turno 2'))
    );

    // 2. Check DailyMachineStaffing for 2026-02-23
    const staffing = await base44.asServiceRole.entities.DailyMachineStaffing.filter({
        date: '2026-02-23',
        shift: 'Mañana'
    });

    // 3. Check Employees matching "Turno 2" or "team_2"
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();
    const matchedEmployees = employees.filter((e: any) => {
        if (!e.equipo && !e.team_key) return false;
        
        // Match logic similar to Breaks.jsx
        if (e.team_key === 'team_2') return true;
        
        const norm = (s: string) => s.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const empTeam = norm(e.equipo || "");
        if (empTeam.includes("turno 2")) return true;
        
        return false;
    });

    return Response.json({
        success: true,
        debug: {
            team_found: team2,
            staffing_count: staffing.length,
            staffing_sample: staffing.slice(0, 3),
            total_employees: employees.length,
            matched_employees_count: matchedEmployees.length,
            matched_sample: matchedEmployees.slice(0, 5).map((e: any) => ({
                id: e.id,
                nombre: e.nombre,
                equipo: e.equipo,
                team_key: e.team_key
            }))
        }
    });

  } catch (error: any) {
    return Response.json({ 
        success: false, 
        error: error.message,
        stack: error.stack
    }, { status: 500 });
  }
});