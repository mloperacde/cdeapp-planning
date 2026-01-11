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
 * Análisis de integridad y relaciones entre entidades
 */
export default function MachineProcessDataAudit() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const runAudit = async () => {
    setLoading(true);
    const auditResults = {
      entities: {},
      relatedEntities: {},
      totalRecords: 0,
      recommendations: [],
      dataQuality: {
        orphanedProcesses: [],
        machinesWithoutProcesses: [],
        processesWithoutMachines: [],
        duplicateMachineNames: [],
        duplicateProcessCodes: []
      }
    };

    try {
      // 1. MÁQUINAS
      const machines = await base44.entities.Machine.list('orden', 500);
      auditResults.entities.Machine = {
        count: machines.length,
        status: "Activa",
        role: "Entidad principal de máquinas",
        fields: Object.keys(machines[0] || {}),
        hasData: machines.length > 0
      };
      auditResults.totalRecords += machines.length;

      // 2. PROCESOS
      const processes = await base44.entities.Process.list('codigo', 200);
      auditResults.entities.Process = {
        count: processes.length,
        status: "Activa",
        role: "Entidad principal de procesos",
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

      // 4. OTRAS ENTIDADES RELACIONADAS
      const relatedEntities = [
        { name: "MaintenanceSchedule", relation: "machine_id", description: "Mantenimientos programados" },
        { name: "MachineAssignment", relation: "machine_id", description: "Asignación de operarios" },
        { name: "MachinePlanning", relation: "machine_id + process_id", description: "Planificación diaria" },
        { name: "ProcessSkillRequirement", relation: "process_id", description: "Habilidades requeridas" },
        { name: "MachineStatus", relation: "machine_id", description: "Estado de máquinas" }
      ];

      for (const entity of relatedEntities) {
        try {
          const records = await base44.entities[entity.name].list('', 200);
          auditResults.relatedEntities[entity.name] = {
            count: records.length,
            status: "Activa",
            relation: entity.relation,
            description: entity.description,
            critical: entity.critical || false
          };
          auditResults.totalRecords += records.length;
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

      // ANÁLISIS DE CALIDAD DE DATOS

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

      // Procesos huérfanos en MachineProcess
      const validProcessIds = new Set(processes.map(p => p.id));
      const validMachineIds = new Set(machines.map(m => m.id));
      machineProcesses.forEach(mp => {
        if (!validProcessIds.has(mp.process_id) || !validMachineIds.has(mp.machine_id)) {
          auditResults.dataQuality.orphanedProcesses.push({
            id: mp.id,
            machine_id: mp.machine_id,
            process_id: mp.process_id,
            reason: !validMachineIds.has(mp.machine_id) ? "Máquina no existe" : "Proceso no existe"
          });
        }
      });

      // RECOMENDACIONES
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
          priority: "LOW",
          action: "Configurar procesos para máquinas sin procesos",
          impact: `${auditResults.dataQuality.machinesWithoutProcesses.length} máquinas sin procesos`,
          solution: "Asignar procesos a través de la página de Gestión de Máquinas"
        });
      }

      if (auditResults.dataQuality.orphanedProcesses.length > 0) {
        auditResults.recommendations.push({
          priority: "HIGH",
          action: "Eliminar referencias huérfanas en MachineProcess",
          impact: `${auditResults.dataQuality.orphanedProcesses.length} registros con referencias rotas`,
          solution: "Limpiar registros de MachineProcess con referencias inválidas"
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