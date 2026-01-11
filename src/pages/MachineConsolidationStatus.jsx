import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MachineConsolidationExecutor from "../components/audit/MachineConsolidationExecutor";

export default function MachineConsolidationStatus() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = async () => {
    try {
      const [machines, masterMachines, processes, machineProcesses, assignments, plannings, maintenance] = await Promise.all([
        base44.entities.Machine.list('', 500),
        base44.entities.MachineMasterDatabase.list('', 500),
        base44.entities.Process.list('', 200),
        base44.entities.MachineProcess.list('', 300),
        base44.entities.MachineAssignment.list('', 300),
        base44.entities.MachinePlanning.list('', 300),
        base44.entities.MaintenanceSchedule.list('', 300)
      ]);

      // Verificar duplicados en Machine
      const machineCodes = {};
      machines.forEach(m => {
        const code = m.codigo?.toLowerCase();
        if (code) {
          if (!machineCodes[code]) machineCodes[code] = 0;
          machineCodes[code]++;
        }
      });
      const duplicateCodes = Object.entries(machineCodes).filter(([_, count]) => count > 1).length;

      // Verificar referencias rotas
      const validMasterIds = new Set(masterMachines.map(m => m.id));
      const brokenAssignments = assignments.filter(a => a.machine_id && !validMasterIds.has(a.machine_id)).length;
      const brokenPlannings = plannings.filter(p => p.machine_id && !validMasterIds.has(p.machine_id)).length;
      const brokenMaintenance = maintenance.filter(m => m.machine_id && !validMasterIds.has(m.machine_id)).length;

      // Procesos integrados en master
      const processesInMaster = masterMachines.reduce((sum, m) => 
        sum + (m.procesos_configurados?.length || 0), 0
      );

      setStatus({
        machines: {
          legacy: machines.length,
          master: masterMachines.length,
          duplicates: duplicateCodes
        },
        processes: {
          total: processes.length,
          relations: machineProcesses.length,
          integrated: processesInMaster
        },
        references: {
          assignments: { total: assignments.length, broken: brokenAssignments },
          plannings: { total: plannings.length, broken: brokenPlannings },
          maintenance: { total: maintenance.length, broken: brokenMaintenance }
        },
        needsConsolidation: machines.length > 0 || duplicateCodes > 0 || 
                           brokenAssignments > 0 || brokenPlannings > 0 || brokenMaintenance > 0
      });
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    checkStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-lg font-medium">Verificando estado de consolidación...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Estado de Consolidación de Máquinas</h1>
            <p className="text-slate-600 mt-1">Monitoreo y ejecución de la migración a MachineMasterDatabase</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleRefresh} 
              variant="outline"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Link to={createPageUrl("Configuration")}>
              <Button variant="outline">
                <ArrowRight className="w-4 h-4 mr-2" />
                Configuración
              </Button>
            </Link>
          </div>
        </div>

        {/* Estado General */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-amber-50 border-amber-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-amber-900">Máquinas Legacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-700">{status.machines.legacy}</p>
              <p className="text-xs text-amber-600 mt-1">Pendientes de migrar</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-900">Máquinas Master</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">{status.machines.master}</p>
              <p className="text-xs text-green-600 mt-1">Ya consolidadas</p>
            </CardContent>
          </Card>

          <Card className={`${status.machines.duplicates > 0 ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm ${status.machines.duplicates > 0 ? 'text-red-900' : 'text-blue-900'}`}>
                Códigos Duplicados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${status.machines.duplicates > 0 ? 'text-red-700' : 'text-blue-700'}`}>
                {status.machines.duplicates}
              </p>
              <p className={`text-xs mt-1 ${status.machines.duplicates > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {status.machines.duplicates > 0 ? 'Requieren corrección' : 'Sin problemas'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-purple-900">Procesos Integrados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">{status.processes.integrated}</p>
              <p className="text-xs text-purple-600 mt-1">En MachineMasterDatabase</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerta de Estado */}
        {status.needsConsolidation ? (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <p className="font-semibold">⚠️ Consolidación Pendiente</p>
              <p className="text-sm mt-1">
                Se detectaron {status.machines.legacy} máquinas legacy, {status.machines.duplicates} códigos duplicados,
                y referencias rotas que requieren atención.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <p className="font-semibold">✅ Sistema Consolidado</p>
              <p className="text-sm mt-1">
                Todas las máquinas han sido migradas a MachineMasterDatabase y las referencias están actualizadas.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs con Detalles */}
        <Tabs defaultValue="executor" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="executor">Ejecutar Consolidación</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="references">Referencias</TabsTrigger>
          </TabsList>

          <TabsContent value="executor" className="space-y-6">
            <MachineConsolidationExecutor />
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    Estado de Máquinas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200">
                    <span className="text-sm font-medium">Máquinas Legacy (Machine)</span>
                    <Badge className="bg-amber-600">{status.machines.legacy}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                    <span className="text-sm font-medium">Máquinas Master</span>
                    <Badge className="bg-green-600">{status.machines.master}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-sm font-medium">Códigos Duplicados</span>
                    <Badge variant={status.machines.duplicates > 0 ? "destructive" : "outline"}>
                      {status.machines.duplicates}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-600" />
                    Estado de Procesos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded border border-purple-200">
                    <span className="text-sm font-medium">Procesos Totales</span>
                    <Badge className="bg-purple-600">{status.processes.total}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                    <span className="text-sm font-medium">Relaciones MachineProcess</span>
                    <Badge className="bg-blue-600">{status.processes.relations}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                    <span className="text-sm font-medium">Integrados en Master</span>
                    <Badge className="bg-green-600">{status.processes.integrated}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="references" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Referencias en Entidades Relacionadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div>
                      <p className="font-medium">MachineAssignment</p>
                      <p className="text-sm text-slate-600">Asignaciones de operarios a máquinas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{status.references.assignments.total}</p>
                      {status.references.assignments.broken > 0 && (
                        <Badge variant="destructive" className="mt-1">
                          {status.references.assignments.broken} rotas
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div>
                      <p className="font-medium">MachinePlanning</p>
                      <p className="text-sm text-slate-600">Planificación diaria de máquinas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{status.references.plannings.total}</p>
                      {status.references.plannings.broken > 0 && (
                        <Badge variant="destructive" className="mt-1">
                          {status.references.plannings.broken} rotas
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div>
                      <p className="font-medium">MaintenanceSchedule</p>
                      <p className="text-sm text-slate-600">Programación de mantenimientos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{status.references.maintenance.total}</p>
                      {status.references.maintenance.broken > 0 && (
                        <Badge variant="destructive" className="mt-1">
                          {status.references.maintenance.broken} rotas
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}