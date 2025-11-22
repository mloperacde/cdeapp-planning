import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Eye
} from "lucide-react";
import { toast } from "sonner";

const SYNC_RULES = {
  employee_empty: "Copiar solo si empleado está vacío",
  always_master: "Siempre usar valor del maestro",
  most_recent: "Usar valor más reciente (por updated_date)",
  merge_text: "Fusionar campos de texto (combinar)"
};

export default function SyncPreviewDialog({ masterEmployees, employees, open, onClose }) {
  const [syncRule, setSyncRule] = useState("employee_empty");
  const [employeeFieldSelections, setEmployeeFieldSelections] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const queryClient = useQueryClient();

  const syncableFields = [
    'codigo_empleado', 'nombre', 'fecha_nacimiento', 'dni', 'nuss', 'sexo', 
    'nacionalidad', 'direccion', 'email', 'telefono_movil', 'formacion',
    'departamento', 'puesto', 'categoria', 'equipo',
    'tipo_jornada', 'num_horas_jornada', 'tipo_turno',
    'horario_manana_inicio', 'horario_manana_fin', 'horario_tarde_inicio', 'horario_tarde_fin',
    'taquilla_vestuario', 'taquilla_numero',
    'fecha_alta', 'tipo_contrato', 'codigo_contrato', 'fecha_fin_contrato', 'empresa_ett'
  ];

  const previewChanges = useMemo(() => {
    const changes = [];

    masterEmployees.forEach(master => {
      let employee = null;
      
      if (master.employee_id) {
        employee = employees.find(e => e.id === master.employee_id);
      } else if (master.codigo_empleado) {
        employee = employees.find(e => e.codigo_empleado === master.codigo_empleado);
      } else if (master.nombre) {
        employee = employees.find(e => e.nombre === master.nombre);
      }

      if (!employee) {
        // Crear nuevo empleado
        const fieldsToSync = syncableFields.filter(field => 
          master[field] !== null && master[field] !== undefined && master[field] !== ''
        );
        
        changes.push({
          type: 'create',
          masterId: master.id,
          masterName: master.nombre,
          fieldsToSync,
          data: fieldsToSync.reduce((acc, field) => {
            acc[field] = master[field];
            return acc;
          }, {})
        });
      } else if (employee) {
        // Actualizar empleado existente
        const fieldsToUpdate = [];
        
        syncableFields.forEach(field => {
          const masterValue = master[field];
          const employeeValue = employee[field];
          
          let shouldUpdate = false;
          let finalValue = masterValue;
          
          if (syncRule === "employee_empty") {
            shouldUpdate = masterValue && !employeeValue;
          } else if (syncRule === "always_master") {
            shouldUpdate = masterValue !== employeeValue;
          } else if (syncRule === "most_recent") {
            const masterDate = master.updated_date || master.created_date;
            const employeeDate = employee.updated_date || employee.created_date;
            shouldUpdate = masterValue !== employeeValue && 
                          new Date(masterDate) > new Date(employeeDate);
          } else if (syncRule === "merge_text") {
            if (masterValue !== employeeValue && 
                typeof masterValue === 'string' && 
                typeof employeeValue === 'string') {
              finalValue = `${employeeValue} | ${masterValue}`;
              shouldUpdate = true;
            }
          }
          
          // Permitir selección individual por empleado
          const employeeSelections = employeeFieldSelections[`${master.id}_${employee?.id}`] || {};
          if (employeeSelections[field] === false) {
            shouldUpdate = false;
          }
          
          if (shouldUpdate) {
            fieldsToUpdate.push({
              field,
              before: employeeValue,
              after: finalValue,
              rule: syncRule
            });
          }
        });

        if (fieldsToUpdate.length > 0) {
          changes.push({
            type: 'update',
            masterId: master.id,
            employeeId: employee.id,
            masterName: master.nombre,
            fieldsToUpdate
          });
        }
      }
    });

    return changes;
  }, [masterEmployees, employees, syncRule, employeeFieldSelections]);

  const handleSyncAll = async () => {
    setSyncing(true);
    const user = await base44.auth.me().catch(() => null);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const change of previewChanges) {
        try {
          if (change.type === 'create') {
            const newEmployee = await base44.entities.Employee.create(change.data);
            
            await base44.entities.EmployeeMasterDatabase.update(change.masterId, {
              employee_id: newEmployee.id,
              ultimo_sincronizado: new Date().toISOString(),
              estado_sincronizacion: 'Sincronizado'
            });

            await base44.entities.EmployeeSyncHistory.create({
              master_employee_id: change.masterId,
              employee_id: newEmployee.id,
              sync_date: new Date().toISOString(),
              sync_type: 'Creación',
              fields_synced: change.fieldsToSync,
              status: 'Exitoso',
              synced_by: user?.email || 'Sistema'
            });

            successCount++;
          } else if (change.type === 'update') {
            const dataToUpdate = {};
            change.fieldsToUpdate.forEach(f => {
              dataToUpdate[f.field] = f.after;
            });

            await base44.entities.Employee.update(change.employeeId, dataToUpdate);

            await base44.entities.EmployeeMasterDatabase.update(change.masterId, {
              ultimo_sincronizado: new Date().toISOString(),
              estado_sincronizacion: 'Sincronizado'
            });

            const changesDetected = {};
            change.fieldsToUpdate.forEach(f => {
              changesDetected[f.field] = {
                before: f.before,
                after: f.after,
                rule: f.rule
              };
            });

            await base44.entities.EmployeeSyncHistory.create({
              master_employee_id: change.masterId,
              employee_id: change.employeeId,
              sync_date: new Date().toISOString(),
              sync_type: 'Sincronización Automática',
              fields_synced: change.fieldsToUpdate.map(f => f.field),
              changes_detected: changesDetected,
              status: 'Exitoso',
              synced_by: user?.email || 'Sistema',
              sync_rule_applied: syncRule
            });

            successCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Error syncing:', change.masterName, error);
          
          await base44.entities.EmployeeMasterDatabase.update(change.masterId, {
            estado_sincronizacion: 'Error'
          });

          await base44.entities.EmployeeSyncHistory.create({
            master_employee_id: change.masterId,
            sync_date: new Date().toISOString(),
            sync_type: 'Sincronización Automática',
            status: 'Error',
            error_message: error.message,
            synced_by: user?.email || 'Sistema'
          });

          errorCount++;
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });

      toast.success(`Sincronización completada: ${successCount} exitosos, ${errorCount} errores`);
      onClose();
    } catch (error) {
      toast.error('Error durante la sincronización: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const stats = {
    creates: previewChanges.filter(c => c.type === 'create').length,
    updates: previewChanges.filter(c => c.type === 'update').length,
    totalFields: previewChanges.reduce((acc, c) => {
      if (c.type === 'create') return acc + c.fieldsToSync.length;
      if (c.type === 'update') return acc + c.fieldsToUpdate.length;
      return acc;
    }, 0)
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Vista Previa de Sincronización
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Reglas de Sincronización */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Regla de Sincronización:</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SYNC_RULES).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <Checkbox
                    id={key}
                    checked={syncRule === key}
                    onCheckedChange={() => setSyncRule(key)}
                  />
                  <label htmlFor={key} className="text-xs font-medium cursor-pointer flex-1">
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="text-xs text-green-700 mb-1">Nuevas Altas</div>
              <div className="text-2xl font-bold text-green-900">{stats.creates}</div>
            </div>
            <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="text-xs text-blue-700 mb-1">Actualizaciones</div>
              <div className="text-2xl font-bold text-blue-900">{stats.updates}</div>
            </div>
            <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="text-xs text-purple-700 mb-1">Total Campos</div>
              <div className="text-2xl font-bold text-purple-900">{stats.totalFields}</div>
            </div>
          </div>

          {/* Preview List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Label className="text-sm font-semibold mb-2">
              Cambios a Realizar ({previewChanges.length}):
            </Label>
            <ScrollArea className="flex-1 border rounded-lg bg-slate-50 p-3">
              <div className="space-y-3">
                {previewChanges.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No hay cambios pendientes</p>
                    <p className="text-xs">Todos los datos están sincronizados</p>
                  </div>
                ) : (
                  previewChanges.map((change, idx) => {
                    const employeeKey = `${change.masterId}_${change.employeeId}`;
                    const isExpanded = expandedEmployee === employeeKey;
                    const selections = employeeFieldSelections[employeeKey] || {};

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          change.type === 'create' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={change.type === 'create' ? 'bg-green-600' : 'bg-blue-600'}>
                                {change.type === 'create' ? 'Nueva Alta' : 'Actualización'}
                              </Badge>
                              <p className="font-semibold text-slate-900">{change.masterName}</p>
                            </div>
                            {change.type === 'update' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedEmployee(isExpanded ? null : employeeKey)}
                                className="h-6 text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                {isExpanded ? 'Ocultar' : 'Seleccionar campos'}
                              </Button>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {change.type === 'create' 
                              ? `${change.fieldsToSync.length} campos` 
                              : `${change.fieldsToUpdate.filter(f => selections[f.field] !== false).length}/${change.fieldsToUpdate.length} campos`
                            }
                          </Badge>
                        </div>

                        {change.type === 'update' && isExpanded && (
                          <div className="mt-2 p-3 bg-white rounded border space-y-2">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Seleccionar campos a sincronizar:</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                              {change.fieldsToUpdate.map((f) => (
                                <div key={f.field} className="flex items-center space-x-2 p-2 bg-slate-50 rounded">
                                  <Checkbox
                                    id={`${employeeKey}-${f.field}`}
                                    checked={selections[f.field] !== false}
                                    onCheckedChange={(checked) => {
                                      setEmployeeFieldSelections(prev => ({
                                        ...prev,
                                        [employeeKey]: {
                                          ...(prev[employeeKey] || {}),
                                          [f.field]: checked
                                        }
                                      }));
                                    }}
                                  />
                                  <label htmlFor={`${employeeKey}-${f.field}`} className="text-xs cursor-pointer flex-1">
                                    {f.field}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {change.type === 'create' && (
                          <div className="mt-2 p-2 bg-white rounded border text-xs space-y-1">
                            <p className="font-semibold text-slate-700">Campos a crear:</p>
                            <div className="flex flex-wrap gap-1">
                              {change.fieldsToSync.slice(0, 8).map((field) => (
                                <Badge key={field} variant="outline" className="text-[10px]">
                                  {field}
                                </Badge>
                              ))}
                              {change.fieldsToSync.length > 8 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{change.fieldsToSync.length - 8} más
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {change.type === 'update' && !isExpanded && (
                          <div className="mt-2 space-y-1">
                            {change.fieldsToUpdate.slice(0, 2).map((f) => (
                              selections[f.field] !== false && (
                                <div key={f.field} className="text-xs p-2 bg-white rounded border">
                                  <div className="font-semibold text-slate-900 mb-1">{f.field}</div>
                                  <div className="space-y-0.5">
                                    <div className="text-red-700 truncate">- {String(f.before || '(vacío)').substring(0, 40)}</div>
                                    <div className="flex items-center gap-1 text-green-700">
                                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{String(f.after || '(vacío)').substring(0, 40)}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            ))}
                            {change.fieldsToUpdate.filter(f => selections[f.field] !== false).length > 2 && (
                              <div className="text-xs text-slate-500 text-center pt-1">
                                +{change.fieldsToUpdate.filter(f => selections[f.field] !== false).length - 2} campos más
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={syncing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSyncAll} 
            disabled={syncing || previewChanges.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aplicar Cambios ({previewChanges.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}