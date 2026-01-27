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
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Play,
  Users,
  Wrench
} from "lucide-react";
import { toast } from "sonner";

export default function MigrationDashboard() {
  return (
    <div className="space-y-6 container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Panel de Migración y Salud de Datos
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Herramientas para diagnosticar y reparar inconsistencias estructurales en la base de datos.
        </p>
      </div>

      <Tabs defaultValue="skills" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="skills">
            <Wrench className="w-4 h-4 mr-2" />
            Habilidades Legacy
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="w-4 h-4 mr-2" />
            Relación Equipos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="skills" className="mt-6">
          <SkillsMigrationPanel />
        </TabsContent>
        
        <TabsContent value="teams" className="mt-6">
          <TeamsMigrationPanel />
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
        const chunkSize = 10;
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
            await new Promise(r => setTimeout(r, 100));
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

  useEffect(() => {
    analyzeTeams();
  }, []);

  const analyzeTeams = async () => {
    setAnalyzing(true);
    try {
        const employees = await base44.entities.EmployeeMasterDatabase.list(undefined, 2000);
        const teamConfigs = await base44.entities.TeamConfig.list();
        
        let mappedCount = 0;
        let unmappedCount = 0;
        let needsUpdateCount = 0;
        const details = [];

        employees.forEach(emp => {
            const currentTeamName = emp.equipo;
            const currentTeamKey = emp.team_key; // New field we want to populate

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
                if (currentTeamKey !== match.team_key) {
                    needsUpdateCount++;
                    details.push({
                        employee_id: emp.id,
                        name: emp.nombre,
                        current_name: currentTeamName,
                        matched_key: match.team_key,
                        matched_name: match.team_name,
                        current_key: currentTeamKey || "(vacío)"
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
          const updates = analysis.details.filter(d => d.matched_key);
          let success = 0;

          // Process in chunks
          const chunks = [];
          const chunkSize = 20;
          for (let i = 0; i < updates.length; i += chunkSize) {
              chunks.push(updates.slice(i, i + chunkSize));
          }

          for (const chunk of chunks) {
              await Promise.all(chunk.map(async (item) => {
                  await base44.entities.EmployeeMasterDatabase.update(item.employee_id, {
                      team_key: item.matched_key
                  });
                  success++;
              }));
              await new Promise(r => setTimeout(r, 50));
          }
          
          toast.success(`Vinculados ${success} empleados a sus Team Keys`);
          analyzeTeams();

      } catch (e) {
          toast.error("Error al vincular equipos");
      } finally {
          setMigrating(false);
      }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidación de Relación Equipos</CardTitle>
        <CardDescription>
          Vincula empleados a identificadores únicos (team_key) en lugar de nombres (string), permitiendo renombrar equipos sin romper asignaciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-center">
            <Button onClick={analyzeTeams} disabled={analyzing || migrating}>
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                Analizar Vinculaciones
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

        {analysis?.needsUpdateCount > 0 && (
            <Alert>
                <ArrowRightLeft className="h-4 w-4" />
                <AlertTitle>Actualización Disponible</AlertTitle>
                <AlertDescription className="flex items-center justify-between mt-2">
                    <span>{analysis.needsUpdateCount} empleados tienen nombre de equipo válido pero les falta el ID interno (team_key).</span>
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
                                            <ArrowRight className="w-3 h-3" /> Vincular a {item.matched_key}
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
