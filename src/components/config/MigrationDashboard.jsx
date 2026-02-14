import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Database, 
  ArrowRightLeft, 
  ArrowRight,
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Play,
  Users,
  Wrench,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import CdeAppSyncPanel from "./CdeAppSyncPanel";

export default function MigrationDashboard() {
  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header Estándar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Panel de Migración y Salud de Datos
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Herramientas para diagnosticar y reparar inconsistencias estructurales en la base de datos
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="skills" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="skills">
            <Wrench className="w-4 h-4 mr-2" />
            Habilidades Legacy
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="w-4 h-4 mr-2" />
            Relación Equipos
          </TabsTrigger>
          <TabsTrigger value="external">
            <Globe className="w-4 h-4 mr-2" />
            Sincronización Externa
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="skills" className="mt-6">
          <SkillsMigrationPanel />
        </TabsContent>
        
        <TabsContent value="teams" className="mt-6">
          <TeamsMigrationPanel />
        </TabsContent>

        <TabsContent value="external" className="mt-6">
          <CdeAppSyncPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkillsMigrationPanel() {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeData = async () => {
    setAnalyzing(true);
    try {
      // 1. Fetch Employees (Legacy Source)
      const employees = await base44.entities.EmployeeMasterDatabase.list(undefined, 2000);
      
      // 2. Fetch Machines (To resolve IDs)
      const machines = await base44.entities.MachineMasterDatabase.list(undefined, 2000);
      const machineMap = new Map(); // id -> machine
      machines.forEach(m => {
          machineMap.set(String(m.id), m);
          if (m.codigo_maquina) machineMap.set(String(m.codigo_maquina), m);
      });

      // 3. Fetch Existing Skills (Modern Source)
      const existingSkills = await base44.entities.EmployeeMachineSkill.list(undefined, 5000);
      const skillSet = new Set();
      existingSkills.forEach(s => {
        skillSet.add(`${s.employee_id}_${s.machine_id}`);
      });

      let pendingMigrations = [];
      let totalLegacyFound = 0;

      employees.forEach(emp => {
        for (let i = 1; i <= 10; i++) {
          const legacyVal = emp[`maquina_${i}`];
          if (legacyVal) {
             // Resolve machine ID
             let machineId = String(legacyVal);
             // Try to find if it's a code or ID
             // If machineMap has it, we get the canonical ID
             const machine = machineMap.get(machineId);
             if (machine) {
                 machineId = machine.id;
             }

             totalLegacyFound++;
             const key = `${emp.id}_${machineId}`;
             
             if (!skillSet.has(key)) {
               pendingMigrations.push({
                 employee_id: emp.id,
                 employee_name: emp.nombre,
                 machine_id: machineId,
                 machine_name: machine ? machine.descripcion : `Legacy: ${legacyVal}`,
                 slot: i,
                 legacy_value: legacyVal
               });
             }
          }
        }
      });

      setAnalysis({
        totalEmployees: employees.length,
        totalLegacyFound,
        pendingCount: pendingMigrations.length,
        pending: pendingMigrations
      });

    } catch (e) {
      console.error(e);
      toast.error("Error al analizar datos");
    } finally {
      setAnalyzing(false);
    }
  };

  const executeMigration = async () => {
    if (!analysis?.pending?.length) return;
    setMigrating(true);
    
    try {
        let successCount = 0;
        const total = analysis.pending.length;
        
        // Process in chunks to avoid overwhelming the API
        const chunks = [];
        const chunkSize = 5;
        for (let i = 0; i < total; i += chunkSize) {
            chunks.push(analysis.pending.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (item) => {
                try {
                    await base44.entities.EmployeeMachineSkill.create({
                        employee_id: item.employee_id,
                        machine_id: item.machine_id,
                        skill_level: 1, // Default basic level
                        is_primary: item.slot === 1, // First slot is primary?
                        assigned_at: new Date().toISOString(),
                        notes: `Migrado desde maquina_${item.slot} (Valor: ${item.legacy_value})`
                    });
                    successCount++;
                } catch (e) {
                    console.error("Failed to migrate item", item, e);
                }
            }));
            
            // Brief pause
            await new Promise(r => setTimeout(r, 1000));
        }

        toast.success(`Migración completada: ${successCount} registros creados`);
        analyzeData(); // Refresh

    } catch (e) {
        toast.error("Error durante la migración");
    } finally {
        setMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Migración de Habilidades Legacy</CardTitle>
        <CardDescription>
          Detecta valores en campos antiguos (maquina_1...10) y crea los registros correspondientes en la nueva tabla EmployeeMachineSkill.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-center">
          <Button onClick={analyzeData} disabled={analyzing || migrating}>
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
            Analizar Datos
          </Button>
          
          {analysis && (
            <div className="flex gap-4 text-sm">
                <Badge variant="outline">Empleados: {analysis.totalEmployees}</Badge>
                <Badge variant="outline">Legacy Slots: {analysis.totalLegacyFound}</Badge>
                <Badge variant={analysis.pendingCount > 0 ? "destructive" : "success"}>
                    Pendientes: {analysis.pendingCount}
                </Badge>
            </div>
          )}
        </div>

        {analysis?.pendingCount > 0 && (
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Acción Requerida</AlertTitle>
                <AlertDescription className="flex items-center justify-between mt-2">
                    <span>Se han encontrado {analysis.pendingCount} habilidades que existen en campos legacy pero faltan en la tabla moderna.</span>
                    <Button onClick={executeMigration} disabled={migrating} size="sm">
                        {migrating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        Migrar Todo
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        {analysis?.pendingCount === 0 && analysis?.totalLegacyFound > 0 && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">Sincronizado</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                    Todos los datos legacy están correctamente reflejados en la tabla moderna. Es seguro usar la nueva arquitectura.
                </AlertDescription>
            </Alert>
        )}

        {analysis?.pending && analysis.pending.length > 0 && (
             <ScrollArea className="h-[300px] border rounded-md p-4">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-2 py-2">Empleado</th>
                            <th className="px-2 py-2">Máquina</th>
                            <th className="px-2 py-2">Slot Legacy</th>
                            <th className="px-2 py-2">Valor Original</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analysis.pending.map((item, idx) => (
                            <tr key={idx} className="border-b">
                                <td className="px-2 py-2 font-medium">{item.employee_name}</td>
                                <td className="px-2 py-2">{item.machine_name}</td>
                                <td className="px-2 py-2">maquina_{item.slot}</td>
                                <td className="px-2 py-2 font-mono text-xs">{item.legacy_value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function TeamsMigrationPanel() {
  const [analyzing, setAnalyzing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [employeesData, setEmployeesData] = useState([]);
  const [teamConfigsData, setTeamConfigsData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const normalize = (s) => (s || "").toString().trim().toLowerCase();

  useEffect(() => {
    analyzeTeams();
  }, []);

  const analyzeTeams = async () => {
    setAnalyzing(true);
    try {
        const employees = await base44.entities.EmployeeMasterDatabase.list(undefined, 2000);
        const teamConfigs = await base44.entities.TeamConfig.list();
        setEmployeesData(employees);
        setTeamConfigsData(teamConfigs);
        
        let mappedCount = 0;
        let unmappedCount = 0;
        let needsUpdateCount = 0;
        const details = [];

        employees.forEach(emp => {
            const currentTeamName = emp.equipo;
            const currentTeamKey = emp.team_key;
            const currentTeamId = emp.team_id;

            if (!currentTeamName) {
                unmappedCount++;
                return;
            }

            // Find matching team config
            const match = teamConfigs.find(t => 
                t.team_name.trim().toLowerCase() === String(currentTeamName).trim().toLowerCase()
            );

            if (match) {
                mappedCount++;
                if (currentTeamKey !== match.team_key || String(currentTeamId || "") !== String(match.id)) {
                    needsUpdateCount++;
                    details.push({
                        employee_id: emp.id,
                        name: emp.nombre,
                        current_name: currentTeamName,
                        matched_key: match.team_key,
                        matched_id: match.id,
                        matched_name: match.team_name,
                        current_key: currentTeamKey || "(vacío)",
                        current_id: currentTeamId || "(vacío)"
                    });
                }
            } else {
                unmappedCount++;
                details.push({
                    employee_id: emp.id,
                    name: emp.nombre,
                    current_name: currentTeamName,
                    status: "No encontrado en configuración"
                });
            }
        });

        setAnalysis({
            total: employees.length,
            mappedCount,
            unmappedCount,
            needsUpdateCount,
            details,
            teamConfigs
        });

    } catch (e) {
        console.error(e);
        toast.error("Error analizando equipos");
    } finally {
        setAnalyzing(false);
    }
  };

  const executeTeamLink = async () => {
      if (!analysis?.details?.length) return;
      setMigrating(true);
      try {
          const updates = analysis.details.filter(d => d.matched_key && d.matched_id);
          let success = 0;

          // Process in chunks
          const chunks = [];
          const chunkSize = 5;
          for (let i = 0; i < updates.length; i += chunkSize) {
              chunks.push(updates.slice(i, i + chunkSize));
          }

          for (const chunk of chunks) {
              await Promise.all(chunk.map(async (item) => {
                  await base44.entities.EmployeeMasterDatabase.update(item.employee_id, {
                      team_key: item.matched_key,
                      team_id: item.matched_id
                  });
                  success++;
              }));
              await new Promise(r => setTimeout(r, 1000));
          }
          
          toast.success(`Vinculados ${success} empleados a sus identificadores de equipo`);
          analyzeTeams();

      } catch (e) {
          toast.error("Error al vincular equipos");
      } finally {
          setMigrating(false);
      }
  };

  const normalizeTurnos = async () => {
    setMigrating(true);
    try {
      // 1) Ensure TeamConfig mapping: team_1 -> "Turno 1", team_2 -> "Turno 2"
      const teams = await base44.entities.TeamConfig.list();
      const norm = (s) => (s || "").toString().trim().toLowerCase();
      const t1 = teams.find(t => t.team_key === "team_1");
      const t2 = teams.find(t => t.team_key === "team_2");
      if (t1 && t1.team_name !== "Turno 1") {
        await base44.entities.TeamConfig.update(t1.id, { team_name: "Turno 1" });
      }
      if (t2 && t2.team_name !== "Turno 2") {
        await base44.entities.TeamConfig.update(t2.id, { team_name: "Turno 2" });
      }
      const team1Id = t1 ? t1.id : (teams.find(t => t.team_key === "team_1")?.id);
      const team2Id = t2 ? t2.id : (teams.find(t => t.team_key === "team_2")?.id);

      // 2) Migrate employees so that:
      //    equipo="Turno 1" => team_key="team_1" (team_id=t1.id)
      //    equipo="Turno 2" => team_key="team_2" (team_id=t2.id)
      const employees = await base44.entities.EmployeeMasterDatabase.list(undefined, 5000);
      const toUpdate = employees.filter(e => {
        const eq = norm(e.equipo);
        if (eq === "turno 1") return e.team_key !== "team_1" || norm(e.equipo) !== "turno 1" || String(e.team_id || "") !== String(team1Id || "");
        if (eq === "turno 2") return e.team_key !== "team_2" || norm(e.equipo) !== "turno 2" || String(e.team_id || "") !== String(team2Id || "");
        return false;
      }).map(e => {
        const eq = norm(e.equipo);
        if (eq === "turno 1") {
          return { id: e.id, data: { equipo: "Turno 1", team_key: "team_1", team_id: team1Id || null } };
        }
        // turno 2
        return { id: e.id, data: { equipo: "Turno 2", team_key: "team_2", team_id: team2Id || null } };
      });

      let success = 0;
      for (let i = 0; i < toUpdate.length; i += 10) {
        const chunk = toUpdate.slice(i, i + 10);
        await Promise.all(chunk.map(u => base44.entities.EmployeeMasterDatabase.update(u.id, u.data)));
        success += chunk.length;
      }

      toast.success(`Normalización completada: ${success} empleados actualizados.`);
      await analyzeTeams();
    } catch (e) {
      console.error(e);
      toast.error("Error al normalizar Turno 1/2");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidación de Relación Equipos</CardTitle>
        <CardDescription>
          Vincula empleados a identificadores únicos (team_key y team_id) en lugar de nombres (string), permitiendo renombrar equipos sin romper asignaciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-center">
            <Button onClick={analyzeTeams} disabled={analyzing || migrating}>
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                Analizar Vinculaciones
            </Button>
            <Button onClick={normalizeTurnos} disabled={migrating} variant="outline">
                {migrating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Normalizar Turno 1/2
            </Button>
            
            {analysis && (
                <div className="flex gap-4 text-sm">
                    <Badge variant="outline">Total: {analysis.total}</Badge>
                    <Badge variant="secondary">Mapeados: {analysis.mappedCount}</Badge>
                    <Badge variant={analysis.needsUpdateCount > 0 ? "destructive" : "success"}>
                        Por Actualizar: {analysis.needsUpdateCount}
                    </Badge>
                </div>
            )}
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Buscar empleado por nombre (p. ej., Cristina Sanches Arguelles)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <ScrollArea className="h-[220px] border rounded-md p-2">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-2">Empleado</th>
                    <th className="px-2 py-2">Equipo</th>
                    <th className="px-2 py-2">team_key</th>
                    <th className="px-2 py-2">Esperado</th>
                    <th className="px-2 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesData
                    .filter(e => normalize(e.nombre).includes(normalize(searchTerm)))
                    .map(emp => {
                      const match = teamConfigsData.find(t => normalize(t.team_name) === normalize(emp.equipo));
                      const expectedKey = match?.team_key || null;
                      const ok = !emp.equipo ? false : emp.team_key === expectedKey;
                      return (
                        <tr key={emp.id} className="border-b">
                          <td className="px-2 py-2 font-medium">{emp.nombre}</td>
                          <td className="px-2 py-2">{emp.equipo || "-"}</td>
                          <td className="px-2 py-2 font-mono text-xs">{emp.team_key || "-"}</td>
                          <td className="px-2 py-2 font-mono text-xs">{expectedKey || "-"}</td>
                          <td className="px-2 py-2">
                            {ok ? (
                              <Badge variant="secondary">Correcto</Badge>
                            ) : (
                              <Badge variant="destructive">Desajuste</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </div>

        {analysis?.needsUpdateCount > 0 && (
            <Alert>
                <ArrowRightLeft className="h-4 w-4" />
                <AlertTitle>Actualización Disponible</AlertTitle>
                <AlertDescription className="flex items-center justify-between mt-2">
                    <span>{analysis.needsUpdateCount} empleados tienen nombre de equipo válido pero les falta el ID interno (team_key/team_id).</span>
                    <Button onClick={executeTeamLink} disabled={migrating} size="sm">
                        {migrating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        Vincular IDs
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        {analysis?.details && analysis.details.length > 0 && (
             <ScrollArea className="h-[300px] border rounded-md p-4">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-2 py-2">Empleado</th>
                            <th className="px-2 py-2">Equipo Actual (String)</th>
                            <th className="px-2 py-2">Estado / Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analysis.details.map((item, idx) => (
                            <tr key={idx} className="border-b">
                                <td className="px-2 py-2 font-medium">{item.name}</td>
                                <td className="px-2 py-2">{item.current_name}</td>
                                <td className="px-2 py-2">
                                    {item.matched_key ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                            <ArrowRight className="w-3 h-3" /> Vincular a {item.matched_key} / {item.matched_id}
                                        </span>
                                    ) : (
                                        <span className="text-red-500">{item.status}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
