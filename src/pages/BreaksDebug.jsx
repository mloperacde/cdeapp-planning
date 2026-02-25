import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function BreaksDebugPage() {
  const [date, setDate] = useState("2026-02-23");
  const [shift, setShift] = useState("Mañana");
  const [teamKey, setTeamKey] = useState("team_2");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const diag = {
        teams: [],
        staffing: [],
        employees_matched: [],
        employees_total: 0
    };

    try {
        // 1. Check Teams
        const teams = await base44.entities.TeamConfig.list();
        diag.teams = teams.filter(t => 
            t.team_key === teamKey || 
            (t.team_name && t.team_name.toLowerCase().includes(teamKey.replace('team_', '').replace('turno ', '')))
        );

        // 2. Check Staffing
        diag.staffing = await base44.entities.DailyMachineStaffing.filter({
            date: date,
            shift: shift
        });

        // 3. Check Employees
        const allEmployees = await base44.entities.EmployeeMasterDatabase.list(undefined, 2000);
        diag.employees_total = allEmployees.length;
        
        const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        
        diag.employees_matched = allEmployees.filter(e => {
            if (!e.equipo && !e.team_key) return false;
            
            // Match logic from Breaks.jsx
            if (teamKey && e.team_key === teamKey) return true;
            
            // Fuzzy match name
            const targetName = diag.teams[0]?.team_name || teamKey;
            const empTeam = normalize(e.equipo);
            const target = normalize(targetName);
            
            if (empTeam === target) return true;
            if (empTeam.length > 3 && target.length > 3) {
                 if (empTeam.includes(target) || target.includes(empTeam)) return true;
            }
            return false;
        }).map(e => ({
            id: e.id,
            nombre: e.nombre,
            equipo: e.equipo,
            team_key: e.team_key
        }));

        setResults(diag);
    } catch (e) {
        console.error(e);
        setResults({ error: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <Card>
        <CardHeader><CardTitle>Diagnóstico de Datos de Descansos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <Input value={date} onChange={e => setDate(e.target.value)} type="date" />
                <Input value={shift} onChange={e => setShift(e.target.value)} placeholder="Turno" />
                <Input value={teamKey} onChange={e => setTeamKey(e.target.value)} placeholder="Team Key (ej. team_2)" />
            </div>
            <Button onClick={runDiagnostics} disabled={loading}>
                {loading ? 'Analizando...' : 'Ejecutar Diagnóstico'}
            </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-4">
            <Card>
                <CardHeader><CardTitle>1. Equipos Encontrados ({results.teams?.length})</CardTitle></CardHeader>
                <CardContent>
                    <pre className="bg-slate-100 p-2 rounded text-xs">
                        {JSON.stringify(results.teams, null, 2)}
                    </pre>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>2. Staffing Confirmado ({results.staffing?.length})</CardTitle></CardHeader>
                <CardContent>
                    <pre className="bg-slate-100 p-2 rounded text-xs max-h-60 overflow-auto">
                        {JSON.stringify(results.staffing, null, 2)}
                    </pre>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>3. Empleados Disponibles ({results.employees_matched?.length} / {results.employees_total})</CardTitle></CardHeader>
                <CardContent>
                    <pre className="bg-slate-100 p-2 rounded text-xs max-h-60 overflow-auto">
                        {JSON.stringify(results.employees_matched, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}