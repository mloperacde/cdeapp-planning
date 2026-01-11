import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  Settings,
  Wrench,
  FileText
} from "lucide-react";

/**
 * AUDITORÍA Y CONSOLIDACIÓN DE DATOS DE MÁQUINAS Y PROCESOS
 * Análisis completo de integridad, referencias y dependencias
 */
export default function MachineProcessDataAudit() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const runAudit = async () => {
    setLoading(true);
    const auditResults = {
      entities: {},
      relatedEntities: {},
      pagesUsage: {},
      totalRecords: 0,
      recommendations: [],
      dataQuality: {
        orphanedReferences: [],
        machinesWithoutProcesses: [],
        duplicateMachineNames: [],
        duplicateMachineCodes: [],
        duplicateProcessCodes: [],
        machinesWithoutMaintenance: [],
        orphanedAssignments: [],
        dataIntegrity: []
      }
    };

    try {
      // 1. MÁQUINAS LEGACY
      const machines = await base44.entities.Machine.list('orden', 500);
      auditResults.entities.Machine = {
        count: machines.length,
        status: "Legacy - Consolidar",
        role: "Entidad original de máquinas (migrar a MachineMasterDatabase)",
        fields: Object.keys(machines[0] || {}),
        hasData: machines.length > 0,
        warning: "⚠️ Se recomienda consolidar en MachineMasterDatabase"
      };
      auditResults.totalRecords += machines.length;

      // 2. MÁQUINAS MASTER DATABASE
      try {
        const masterMachines = await base44.entities.MachineMasterDatabase.list('codigo_maquina', 500);
        auditResults.entities.MachineMasterDatabase = {
          count: masterMachines.length,
          status: "Nueva - Fuente Única",
          role: "Base de datos maestra consolidada",
          fields: Object.keys(masterMachines[0] || {}),
          hasData: masterMachines.length > 0
        };
        auditResults.totalRecords += masterMachines.length;

        // Detectar duplicados entre Machine y MachineMasterDatabase
        const machineCodesSet = new Set(machines.map(m => m.codigo?.toLowerCase()));
        const masterCodesSet = new Set(masterMachines.map(m => m.codigo_maquina?.toLowerCase()));
        const commonCodes = [...machineCodesSet].filter(code => masterCodesSet.has(code));
        
        if (commonCodes.length > 0) {
          auditResults.dataQuality.dataIntegrity.push({
            type: "duplicate_data",
            message: `${commonCodes.length} máquinas duplicadas entre Machine y MachineMasterDatabase`,
            codes: commonCodes,
            action: "Consolidar datos en MachineMasterDatabase y eliminar Machine"
          });
        }
      } catch (e) {
        auditResults.entities.MachineMasterDatabase = {
          count: 0,
          status: "No existe",
          error: "Entidad no creada aún",
          recommendation: "Crear MachineMasterDatabase para consolidar datos"
        };
      }

      // 3. PROCESOS
      const processes = await base44.entities.Process.list('codigo', 200);
      auditResults.entities.Process = {
        count: processes.length,
        status: "Activa",
        role: "Entidad de procesos (se integrarán en MachineMasterDatabase)",
        fields: Object.keys(processes[0] || {}),
        hasData: processes.length > 0
      };
      auditResults.totalRecords += processes.length;

      // 3. RELACIÓN MÁQUINA-PROCESO
      const machineProcesses = await base44.entities.MachineProcess.list('', 500);
      auditResults.relatedEntities.MachineProcess = {
        count: machineProcesses.length,
        status: "Activa",
        relation: "machine_id + process_id",
        description: "Configuración de procesos por máquina",
        critical: true
      };
      auditResults.totalRecords += machineProcesses.length;

      // 4. ENTIDADES RELACIONADAS CON MÁQUINAS
      const relatedEntities = [
        { name: "MachineProcess", relation: "machine_id + process_id", description: "Relación máquina-proceso", critical: true },
        { name: "MaintenanceSchedule", relation: "machine_id", description: "Mantenimientos programados", critical: true },
        { name: "MachineAssignment", relation: "machine_id", description: "Asignación de operarios", critical: true },
        { name: "MachinePlanning", relation: "machine_id + process_id", description: "Planificación diaria", critical: true },
        { name: "MachineStatus", relation: "machine_id", description: "Estado de máquinas", critical: false },
        { name: "ProcessSkillRequirement", relation: "process_id", description: "Habilidades requeridas por proceso", critical: false },
        { name: "ShiftAssignment", relation: "maquinas_asignadas[]", description: "Turnos con máquinas asignadas", critical: false },
        { name: "EmployeeSkill", relation: "machine_id (opcional)", description: "Habilidades en máquinas específicas", critical: false }
      ];

      const machineRelatedData = {};
      for (const entity of relatedEntities) {
        try {
          const records = await base44.entities[entity.name].list('', 300);
          auditResults.relatedEntities[entity.name] = {
            count: records.length,
            status: "Activa",
            relation: entity.relation,
            description: entity.description,
            critical: entity.critical
          };
          auditResults.totalRecords += records.length;
          machineRelatedData[entity.name] = records;
        } catch (e) {
          auditResults.relatedEntities[entity.name] = {
            count: 0,
            status: "Error",
            error: e.message,
            relation: entity.relation,
            description: entity.description
          };
        }
      }

      // 5. ANÁLISIS DE PÁGINAS QUE USAN MÁQUINAS
      auditResults.pagesUsage = {
        usingMachine: [
          "MachineManagement",
          "MaintenanceTracking", 
          "MachineMaintenance",
          "MachineAssignments",
          "ProductionPlanning",
          "DailyPlanning",
          "Timeline",
          "ShiftPlanning"
        ],
        usingProcess: [
          "ProcessConfiguration",
          "MachinePlanning",
          "ShiftPlanning",
          "SkillMatrix"
        ],
        pendingMigration: []
      };

      // 6. ANÁLISIS EXHAUSTIVO DE CALIDAD DE DATOS

      // Máquinas con nombres duplicados
      const machineNames = {};
      machines.forEach(m => {
        const name = m.nombre?.toLowerCase();
        if (name) {
          if (!machineNames[name]) machineNames[name] = [];
          machineNames[name].push(m);
        }
      });
      Object.keys(machineNames).forEach(name => {
        if (machineNames[name].length > 1) {
          auditResults.dataQuality.duplicateMachineNames.push({
            nombre: name,
            count: machineNames[name].length,
            ids: machineNames[name].map(m => m.id)
          });
        }
      });

      // Máquinas con códigos duplicados
      const machineCodes = {};
      machines.forEach(m => {
        const code = m.codigo?.toLowerCase();
        if (code) {
          if (!machineCodes[code]) machineCodes[code] = [];
          machineCodes[code].push(m);
        }
      });
      Object.keys(machineCodes).forEach(code => {
        if (machineCodes[code].length > 1) {
          auditResults.dataQuality.duplicateMachineCodes.push({
            codigo: code,
            count: machineCodes[code].length,
            ids: machineCodes[code].map(m => m.id)
          });
        }
      });

      // Procesos con códigos duplicados
      const processCodes = {};
      processes.forEach(p => {
        const code = p.codigo?.toLowerCase();
        if (code) {
          if (!processCodes[code]) processCodes[code] = [];
          processCodes[code].push(p);
        }
      });
      Object.keys(processCodes).forEach(code => {
        if (processCodes[code].length > 1) {
          auditResults.dataQuality.duplicateProcessCodes.push({
            codigo: code,
            count: processCodes[code].length,
            ids: processCodes[code].map(p => p.id)
          });
        }
      });

      // Máquinas sin procesos configurados
      const machineProcesses = machineRelatedData.MachineProcess || [];
      const machinesWithProcesses = new Set(machineProcesses.map(mp => mp.machine_id));
      machines.forEach(m => {
        if (!machinesWithProcesses.has(m.id) && !m.procesos_ids?.length) {
          auditResults.dataQuality.machinesWithoutProcesses.push({
            id: m.id,
            nombre: m.nombre,
            codigo: m.codigo
          });
        }
      });

      // Referencias huérfanas en todas las entidades
      const validMachineIds = new Set(machines.map(m => m.id));
      const validProcessIds = new Set(processes.map(p => p.id));

      // MachineProcess
      machineProcesses.forEach(mp => {
        if (!validProcessIds.has(mp.process_id) || !validMachineIds.has(mp.machine_id)) {
          auditResults.dataQuality.orphanedReferences.push({
            entity: "MachineProcess",
            id: mp.id,
            machine_id: mp.machine_id,
            process_id: mp.process_id,
            reason: !validMachineIds.has(mp.machine_id) ? "Máquina no existe" : "Proceso no existe"
          });
        }
      });

      // MaintenanceSchedule
      const maintenanceSchedules = machineRelatedData.MaintenanceSchedule || [];
      maintenanceSchedules.forEach(ms => {
        if (!validMachineIds.has(ms.machine_id)) {
          auditResults.dataQuality.orphanedReferences.push({
            entity: "MaintenanceSchedule",
            id: ms.id,
            machine_id: ms.machine_id,
            reason: "Máquina no existe"
          });
        }
      });

      // MachineAssignment
      const assignments = machineRelatedData.MachineAssignment || [];
      assignments.forEach(ma => {
        if (!validMachineIds.has(ma.machine_id)) {
          auditResults.dataQuality.orphanedAssignments.push({
            entity: "MachineAssignment",
            id: ma.id,
            machine_id: ma.machine_id,
            team_key: ma.team_key,
            reason: "Máquina no existe"
          });
        }
      });

      // MachinePlanning
      const plannings = machineRelatedData.MachinePlanning || [];
      plannings.forEach(mp => {
        if (!validMachineIds.has(mp.machine_id)) {
          auditResults.dataQuality.orphanedReferences.push({
            entity: "MachinePlanning",
            id: mp.id,
            machine_id: mp.machine_id,
            reason: "Máquina no existe"
          });
        }
        if (mp.process_id && !validProcessIds.has(mp.process_id)) {
          auditResults.dataQuality.orphanedReferences.push({
            entity: "MachinePlanning",
            id: mp.id,
            process_id: mp.process_id,
            reason: "Proceso no existe"
          });
        }
      });

      // Máquinas sin mantenimiento programado
      const machinesWithMaintenance = new Set(maintenanceSchedules.map(ms => ms.machine_id));
      machines.forEach(m => {
        if (!machinesWithMaintenance.has(m.id) && m.estado !== "Fuera de servicio") {
          auditResults.dataQuality.machinesWithoutMaintenance.push({
            id: m.id,
            nombre: m.nombre,
            codigo: m.codigo,
            warning: "No tiene mantenimiento programado"
          });
        }
      });

      // 7. RECOMENDACIONES CRÍTICAS
      
      // Consolidación de datos
      if (machines.length > 0 && auditResults.entities.MachineMasterDatabase?.count === 0) {
        auditResults.recommendations.push({
          priority: "CRITICAL",
          action: "Crear y poblar MachineMasterDatabase",
          impact: `${machines.length} máquinas requieren consolidación`,
          solution: "Migrar datos de Machine a MachineMasterDatabase incluyendo procesos configurados"
        });
      }

      if (auditResults.dataQuality.dataIntegrity.length > 0) {
        auditResults.recommendations.push({
          priority: "CRITICAL",
          action: "Consolidar datos duplicados entre Machine y MachineMasterDatabase",
          impact: `Datos duplicados detectados`,
          solution: "Consolidar en MachineMasterDatabase y eliminar Machine legacy"
        });
      }

      if (auditResults.dataQuality.orphanedReferences.length > 0) {
        auditResults.recommendations.push({
          priority: "HIGH",
          action: "Eliminar referencias huérfanas",
          impact: `${auditResults.dataQuality.orphanedReferences.length} referencias rotas detectadas`,
          solution: "Limpiar registros con machine_id o process_id inválidos"
        });
      }

      if (auditResults.dataQuality.duplicateMachineCodes.length > 0) {
        auditResults.recommendations.push({
          priority: "HIGH",
          action: "Resolver códigos de máquinas duplicados",
          impact: `${auditResults.dataQuality.duplicateMachineCodes.length} códigos duplicados`,
          solution: "Asignar códigos únicos a cada máquina"
        });
      }

      if (auditResults.dataQuality.duplicateMachineNames.length > 0) {
        auditResults.recommendations.push({
          priority: "MEDIUM",
          action: "Revisar máquinas con nombres duplicados",
          impact: `${auditResults.dataQuality.duplicateMachineNames.length} casos detectados`,
          solution: "Renombrar o consolidar máquinas duplicadas"
        });
      }

      if (auditResults.dataQuality.machinesWithoutProcesses.length > 0) {
        auditResults.recommendations.push({
          priority: "MEDIUM",
          action: "Configurar procesos para máquinas",
          impact: `${auditResults.dataQuality.machinesWithoutProcesses.length} máquinas sin procesos`,
          solution: "Asignar procesos en MachineMasterDatabase.procesos_configurados"
        });
      }

      if (auditResults.dataQuality.machinesWithoutMaintenance.length > 0) {
        auditResults.recommendations.push({
          priority: "MEDIUM",
          action: "Programar mantenimiento para máquinas",
          impact: `${auditResults.dataQuality.machinesWithoutMaintenance.length} máquinas sin mantenimiento`,
          solution: "Crear programas de mantenimiento preventivo"
        });
      }

      if (auditResults.dataQuality.orphanedAssignments.length > 0) {
        auditResults.recommendations.push({
          priority: "MEDIUM",
          action: "Limpiar asignaciones huérfanas",
          impact: `${auditResults.dataQuality.orphanedAssignments.length} asignaciones con referencias rotas`,
          solution: "Eliminar registros de MachineAssignment inválidos"
        });
      }

      setResults(auditResults);
    } catch (error) {
      console.error("Error en auditoría:", error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  const exportReport = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `machine-process-audit-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-lg font-medium">Ejecutando auditoría de Máquinas y Procesos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.error) {
    return (
      <Alert className="border-red-300 bg-red-50">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <AlertDescription className="text-red-900">
          Error al ejecutar auditoría: {results?.error || "Error desconocido"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="entities">Entidades</TabsTrigger>
          <TabsTrigger value="quality">Calidad</TabsTrigger>
        </TabsList>
        <Button onClick={exportReport} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      <TabsContent value="overview" className="space-y-6">
        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-900">Total Registros</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">{results.totalRecords}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-900">Máquinas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">{results.entities.Machine?.count || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-purple-900">Procesos Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">{results.entities.Process?.count || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recomendaciones Críticas */}
        {results.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Recomendaciones ({results.recommendations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      rec.priority === "HIGH" ? "bg-red-50 border-red-300" :
                      rec.priority === "MEDIUM" ? "bg-amber-50 border-amber-300" :
                      "bg-blue-50 border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{rec.action}</h4>
                      <Badge className={
                        rec.priority === "HIGH" ? "bg-red-600" :
                        rec.priority === "MEDIUM" ? "bg-amber-600" :
                        "bg-blue-600"
                      }>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">
                      <strong>Impacto:</strong> {rec.impact}
                    </p>
                    <p className="text-sm text-slate-600">
                      <strong>Solución:</strong> {rec.solution}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="entities" className="space-y-6">
        {/* Entidades Principales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Entidades Principales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(results.entities).map(([name, data]) => (
                <div key={name} className="p-4 rounded-lg border-2 bg-green-50 border-green-300">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold">{name}</h3>
                      <p className="text-sm text-slate-700">{data.role}</p>
                    </div>
                    <Badge className="bg-green-600">{data.status}</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-600">
                    <span>📊 {data.count} registros</span>
                    {data.fields && <span>🔧 {data.fields.length} campos</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Entidades Relacionadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              Entidades Relacionadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(results.relatedEntities).map(([name, data]) => (
                <div
                  key={name}
                  className={`p-3 rounded-lg border ${
                    data.critical ? "bg-orange-50 border-orange-300" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{name}</span>
                    {data.critical && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
                        Crítica
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-1">{data.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Relación: {data.relation}</span>
                    <Badge variant="outline">{data.count} registros</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="quality" className="space-y-6">
        {/* Problemas de Calidad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Análisis de Calidad de Datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Nombres Duplicados */}
              {results.dataQuality.duplicateMachineNames.length > 0 && (
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">
                    ⚠️ Máquinas con Nombres Duplicados ({results.dataQuality.duplicateMachineNames.length})
                  </h3>
                  <div className="space-y-2">
                    {results.dataQuality.duplicateMachineNames.map((dup, idx) => (
                      <div key={idx} className="p-3 bg-amber-50 rounded border border-amber-200">
                        <p className="text-sm font-medium">{dup.nombre}</p>
                        <p className="text-xs text-slate-600">{dup.count} máquinas con este nombre</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Códigos Duplicados */}
              {results.dataQuality.duplicateProcessCodes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">
                    ⚠️ Procesos con Códigos Duplicados ({results.dataQuality.duplicateProcessCodes.length})
                  </h3>
                  <div className="space-y-2">
                    {results.dataQuality.duplicateProcessCodes.map((dup, idx) => (
                      <div key={idx} className="p-3 bg-amber-50 rounded border border-amber-200">
                        <p className="text-sm font-medium">{dup.codigo}</p>
                        <p className="text-xs text-slate-600">{dup.count} procesos con este código</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Máquinas Sin Procesos */}
              {results.dataQuality.machinesWithoutProcesses.length > 0 && (
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    ℹ️ Máquinas Sin Procesos Configurados ({results.dataQuality.machinesWithoutProcesses.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {results.dataQuality.machinesWithoutProcesses.slice(0, 10).map((machine, idx) => (
                      <div key={idx} className="p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                        {machine.nombre} ({machine.codigo})
                      </div>
                    ))}
                  </div>
                  {results.dataQuality.machinesWithoutProcesses.length > 10 && (
                    <p className="text-xs text-slate-500 mt-2">
                      ... y {results.dataQuality.machinesWithoutProcesses.length - 10} más
                    </p>
                  )}
                </div>
              )}

              {/* Referencias Huérfanas */}
              {results.dataQuality.orphanedProcesses.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">
                    🔴 Referencias Rotas en MachineProcess ({results.dataQuality.orphanedProcesses.length})
                  </h3>
                  <div className="space-y-2">
                    {results.dataQuality.orphanedProcesses.slice(0, 5).map((orphan, idx) => (
                      <div key={idx} className="p-3 bg-red-50 rounded border border-red-200">
                        <p className="text-sm font-medium">ID: {orphan.id}</p>
                        <p className="text-xs text-slate-600">Razón: {orphan.reason}</p>
                      </div>
                    ))}
                  </div>
                  {results.dataQuality.orphanedProcesses.length > 5 && (
                    <p className="text-xs text-slate-500 mt-2">
                      ... y {results.dataQuality.orphanedProcesses.length - 5} más
                    </p>
                  )}
                </div>
              )}

              {/* Todo Correcto */}
              {results.dataQuality.duplicateMachineNames.length === 0 &&
               results.dataQuality.duplicateProcessCodes.length === 0 &&
               results.dataQuality.machinesWithoutProcesses.length === 0 &&
               results.dataQuality.orphanedProcesses.length === 0 && (
                <Alert className="border-green-300 bg-green-50">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    ✅ No se detectaron problemas de calidad de datos. Todas las relaciones están correctas.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}