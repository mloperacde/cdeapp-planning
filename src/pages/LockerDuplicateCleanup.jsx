import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, RefreshCw, CheckCircle2, Database } from "lucide-react";
import { toast } from "sonner";

export default function LockerDuplicateCleanup() {
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const duplicates = useMemo(() => {
    const duplicateMap = new Map();
    
    lockerAssignments.forEach(la => {
      if (!la.vestuario || !la.numero_taquilla_actual || la.requiere_taquilla === false) return;
      
      const cleanId = la.numero_taquilla_actual.replace(/['"]/g, '').trim();
      if (!cleanId) return;
      
      const key = `${la.vestuario}-${cleanId}`;
      
      if (!duplicateMap.has(key)) {
        duplicateMap.set(key, []);
      }
      duplicateMap.get(key).push(la);
    });
    
    const duplicatesList = [];
    duplicateMap.forEach((assignments, key) => {
      if (assignments.length > 1) {
        duplicatesList.push({
          key,
          vestuario: assignments[0].vestuario,
          lockerId: assignments[0].numero_taquilla_actual.replace(/['"]/g, '').trim(),
          assignments
        });
      }
    });
    
    return duplicatesList;
  }, [lockerAssignments]);

  const orphanedAssignments = useMemo(() => {
    return lockerAssignments.filter(la => {
      const employeeExists = employees.some(e => e.id === la.employee_id);
      return !employeeExists;
    });
  }, [lockerAssignments, employees]);

  const cleanupMutation = useMutation({
    mutationFn: async ({ type, data }) => {
      if (type === "duplicates") {
        const promises = data.map(async (dup) => {
          const sortedByDate = [...dup.assignments].sort((a, b) => 
            new Date(b.fecha_asignacion || b.created_date) - new Date(a.fecha_asignacion || a.created_date)
          );
          
          const toKeep = sortedByDate[0];
          const toDelete = sortedByDate.slice(1);
          
          return Promise.all(toDelete.map(la => base44.entities.LockerAssignment.delete(la.id)));
        });
        
        await Promise.all(promises);
        return { deleted: data.reduce((sum, d) => sum + d.assignments.length - 1, 0) };
      }
      
      if (type === "orphaned") {
        await Promise.all(data.map(la => base44.entities.LockerAssignment.delete(la.id)));
        return { deleted: data.length };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      toast.success(`✅ ${result.deleted} registro(s) eliminado(s)`);
    }
  });

  const handleCleanupDuplicates = () => {
    if (duplicates.length === 0) return;
    
    if (window.confirm(`¿Eliminar ${duplicates.reduce((sum, d) => sum + d.assignments.length - 1, 0)} asignaciones duplicadas? Se mantendrá la más reciente de cada grupo.`)) {
      cleanupMutation.mutate({ type: "duplicates", data: duplicates });
    }
  };

  const handleCleanupOrphaned = () => {
    if (orphanedAssignments.length === 0) return;
    
    if (window.confirm(`¿Eliminar ${orphanedAssignments.length} asignaciones huérfanas (sin empleado asociado)?`)) {
      cleanupMutation.mutate({ type: "orphaned", data: orphanedAssignments });
    }
  };

  const handleRefreshCache = () => {
    setProcessing(true);
    queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setTimeout(() => {
      setProcessing(false);
      toast.success("Caché actualizado");
    }, 1000);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Limpieza de Datos - Taquillas
          </h1>
          <p className="text-slate-600 mt-1">
            Detecta y corrige duplicados e inconsistencias en asignaciones de taquillas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Asignaciones</p>
                  <p className="text-2xl font-bold text-blue-900">{lockerAssignments.length}</p>
                </div>
                <Database className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Duplicadas</p>
                  <p className="text-2xl font-bold text-red-900">{duplicates.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Huérfanas</p>
                  <p className="text-2xl font-bold text-amber-900">{orphanedAssignments.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Taquillas Duplicadas ({duplicates.length})
                </CardTitle>
                {duplicates.length > 0 && (
                  <Button
                    onClick={handleCleanupDuplicates}
                    disabled={cleanupMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpiar Duplicados
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {duplicates.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-slate-600">No hay duplicados detectados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicates.map((dup) => (
                    <div key={dup.key} className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <Badge className="bg-red-600 text-white">
                            {dup.vestuario} - Taquilla {dup.lockerId}
                          </Badge>
                          <span className="text-sm text-red-800 ml-2">
                            ({dup.assignments.length} asignaciones)
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {dup.assignments.map((la, idx) => {
                          const employee = employees.find(e => e.id === la.employee_id);
                          const isNewest = idx === 0;
                          return (
                            <div key={la.id} className={`p-2 rounded ${isNewest ? 'bg-green-100 border-2 border-green-400' : 'bg-white'}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-slate-900">{employee?.nombre || "Empleado no encontrado"}</span>
                                  <span className="text-xs text-slate-500 ml-2">
                                    {la.fecha_asignacion ? new Date(la.fecha_asignacion).toLocaleString() : "Sin fecha"}
                                  </span>
                                </div>
                                {isNewest && (
                                  <Badge className="bg-green-600 text-white text-xs">
                                    Se mantendrá
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Asignaciones Huérfanas ({orphanedAssignments.length})
                </CardTitle>
                {orphanedAssignments.length > 0 && (
                  <Button
                    onClick={handleCleanupOrphaned}
                    disabled={cleanupMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Huérfanas
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {orphanedAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-slate-600">No hay asignaciones huérfanas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orphanedAssignments.map((la) => (
                    <div key={la.id} className="p-3 bg-amber-50 border border-amber-200 rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-amber-900">
                            {la.vestuario} - Taquilla {la.numero_taquilla_actual?.replace(/['"]/g, '').trim()}
                          </span>
                          <p className="text-xs text-slate-600">Employee ID: {la.employee_id}</p>
                        </div>
                        <Badge variant="destructive">Sin empleado</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-2 border-blue-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Actualizar Caché del Sistema</h3>
                  <p className="text-sm text-blue-800">
                    Fuerza la recarga de todos los datos de taquillas para resolver inconsistencias visuales
                  </p>
                </div>
                <Button
                  onClick={handleRefreshCache}
                  disabled={processing}
                  variant="outline"
                  className="border-blue-400"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                  {processing ? "Actualizando..." : "Actualizar Caché"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}