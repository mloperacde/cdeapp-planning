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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Clock,
  Eye,
  Undo2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const SYNCABLE_FIELDS = [
  { key: 'codigo_empleado', label: 'Código Empleado' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'estado_empleado', label: 'Estado' },
  { key: 'fecha_baja', label: 'Fecha Baja' },
  { key: 'motivo_baja', label: 'Motivo Baja' },
  { key: 'tasa_absentismo', label: 'Tasa Absentismo' },
  { key: 'horas_no_trabajadas', label: 'Horas No Trabajadas' },
  { key: 'horas_deberian_trabajarse', label: 'Horas Deberían Trabajarse' },
  { key: 'fecha_nacimiento', label: 'Fecha Nacimiento' },
  { key: 'dni', label: 'DNI' },
  { key: 'nuss', label: 'NUSS' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'nacionalidad', label: 'Nacionalidad' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'formacion', label: 'Formación' },
  { key: 'email', label: 'Email' },
  { key: 'telefono_movil', label: 'Teléfono Móvil' },
  { key: 'contacto_emergencia_nombre', label: 'Contacto Emergencia' },
  { key: 'contacto_emergencia_telefono', label: 'Teléfono Emergencia' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'tipo_jornada', label: 'Tipo Jornada' },
  { key: 'num_horas_jornada', label: 'Horas Jornada' },
  { key: 'tipo_turno', label: 'Tipo Turno' },
  { key: 'horario_manana_inicio', label: 'Horario Mañana Inicio' },
  { key: 'horario_manana_fin', label: 'Horario Mañana Fin' },
  { key: 'horario_tarde_inicio', label: 'Horario Tarde Inicio' },
  { key: 'horario_tarde_fin', label: 'Horario Tarde Fin' },
  { key: 'taquilla_vestuario', label: 'Taquilla Vestuario' },
  { key: 'taquilla_numero', label: 'Número Taquilla' },
  { key: 'disponibilidad', label: 'Disponibilidad' },
  { key: 'incluir_en_planning', label: 'Incluir en Planning' },
  { key: 'fecha_alta', label: 'Fecha Alta' },
  { key: 'tipo_contrato', label: 'Tipo Contrato' },
  { key: 'codigo_contrato', label: 'Código Contrato' },
  { key: 'fecha_fin_contrato', label: 'Fecha Fin Contrato' },
  { key: 'empresa_ett', label: 'Empresa ETT' },
  { key: 'salario_anual', label: 'Salario Anual' },
  { key: 'evaluacion_responsable', label: 'Evaluación Responsable' },
  { key: 'propuesta_cambio_categoria', label: 'Propuesta Cambio Categoría' },
  { key: 'maquina_1', label: 'Máquina 1' },
  { key: 'maquina_2', label: 'Máquina 2' },
  { key: 'maquina_3', label: 'Máquina 3' },
];

export default function SyncComparisonDialog({ masterEmployee, existingEmployee, open, onClose }) {
  const [selectedFields, setSelectedFields] = useState(SYNCABLE_FIELDS.map(f => f.key));
  const [syncing, setSyncing] = useState(false);
  const [expandedField, setExpandedField] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const queryClient = useQueryClient();

  const differences = useMemo(() => {
    if (!existingEmployee) return SYNCABLE_FIELDS.map(f => f.key);
    
    const diffs = [];
    SYNCABLE_FIELDS.forEach(field => {
      const masterValue = masterEmployee[field.key];
      const employeeValue = existingEmployee[field.key];
      
      if (masterValue !== employeeValue) {
        diffs.push(field.key);
      }
    });
    return diffs;
  }, [masterEmployee, existingEmployee]);

  // Cargar historial de sincronización
  React.useEffect(() => {
    if (open && masterEmployee) {
      base44.entities.EmployeeSyncHistory.filter({ 
        master_employee_id: masterEmployee.id 
      }, '-sync_date', 5)
        .then(data => setSyncHistory(data))
        .catch(() => setSyncHistory([]));
    }
  }, [open, masterEmployee]);

  const isLongText = (value) => {
    return typeof value === 'string' && value.length > 50;
  };

  const renderDiffView = (before, after) => {
    const beforeStr = String(before || '');
    const afterStr = String(after || '');

    if (!isLongText(beforeStr) && !isLongText(afterStr)) {
      return null;
    }

    return (
      <div className="mt-2 p-3 bg-slate-900 rounded-lg text-xs font-mono space-y-2">
        <div className="text-red-400">
          <div className="text-slate-400 mb-1">- Anterior:</div>
          <div className="pl-2 whitespace-pre-wrap break-words">{beforeStr || '(vacío)'}</div>
        </div>
        <div className="text-green-400">
          <div className="text-slate-400 mb-1">+ Nuevo:</div>
          <div className="pl-2 whitespace-pre-wrap break-words">{afterStr || '(vacío)'}</div>
        </div>
      </div>
    );
  };

  const handleUndoSync = async (historyItem) => {
    if (!historyItem.changes_detected || !existingEmployee) {
      toast.error('No se puede deshacer: información insuficiente');
      return;
    }

    const confirmMsg = `¿Revertir sincronización del ${new Date(historyItem.sync_date).toLocaleString()}?\n\nSe restaurarán ${Object.keys(historyItem.changes_detected).length} campos a sus valores anteriores.`;
    
    if (!confirm(confirmMsg)) return;

    try {
      const dataToRestore = {};
      Object.entries(historyItem.changes_detected).forEach(([key, change]) => {
        dataToRestore[key] = change.before;
      });

      await base44.entities.Employee.update(existingEmployee.id, dataToRestore);

      await base44.entities.EmployeeSyncHistory.create({
        master_employee_id: masterEmployee.id,
        employee_id: existingEmployee.id,
        sync_date: new Date().toISOString(),
        sync_type: 'Deshacer Sincronización',
        fields_synced: Object.keys(dataToRestore),
        changes_detected: historyItem.changes_detected,
        status: 'Exitoso',
        synced_by: (await base44.auth.me().catch(() => null))?.email || 'Sistema'
      });

      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
      
      toast.success('Sincronización revertida correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al deshacer: ' + error.message);
    }
  };

  const toggleField = (fieldKey) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(k => k !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      
      const dataToSync = {};
      selectedFields.forEach(key => {
        dataToSync[key] = masterEmployee[key];
      });

      const changesDetected = {};
      differences.forEach(key => {
        if (selectedFields.includes(key)) {
          changesDetected[key] = {
            before: existingEmployee?.[key] || null,
            after: masterEmployee[key]
          };
        }
      });

      let employeeId;
      let syncType;

      if (existingEmployee) {
        await base44.entities.Employee.update(existingEmployee.id, dataToSync);
        employeeId = existingEmployee.id;
        syncType = selectedFields.length === SYNCABLE_FIELDS.length 
          ? 'Sincronización Total' 
          : 'Sincronización Parcial';
      } else {
        const newEmployee = await base44.entities.Employee.create(dataToSync);
        employeeId = newEmployee.id;
        syncType = 'Creación';
      }

      await base44.entities.EmployeeMasterDatabase.update(masterEmployee.id, {
        employee_id: employeeId,
        ultimo_sincronizado: new Date().toISOString(),
        estado_sincronizacion: 'Sincronizado'
      });

      await base44.entities.EmployeeSyncHistory.create({
        master_employee_id: masterEmployee.id,
        employee_id: employeeId,
        sync_date: new Date().toISOString(),
        sync_type: syncType,
        fields_synced: selectedFields,
        changes_detected: changesDetected,
        status: 'Exitoso',
        synced_by: user?.email || 'Sistema'
      });

      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });

      toast.success(`Sincronización exitosa: ${selectedFields.length} campos actualizados`);
      onClose();
    } catch (error) {
      console.error('Error syncing:', error);
      
      await base44.entities.EmployeeSyncHistory.create({
        master_employee_id: masterEmployee.id,
        employee_id: existingEmployee?.id,
        sync_date: new Date().toISOString(),
        sync_type: 'Sincronización Parcial',
        fields_synced: selectedFields,
        status: 'Error',
        error_message: error.message,
      });

      toast.error('Error en la sincronización: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const selectedDifferences = useMemo(() => {
    return differences.filter(key => selectedFields.includes(key));
  }, [differences, selectedFields]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            Sincronización: {masterEmployee?.nombre}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sync" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sync">
              <RefreshCw className="w-4 h-4 mr-2" />
              Comparación y Sincronización
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-2" />
              Historial ({syncHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="text-xs text-blue-700 mb-1">Total Campos</div>
                <div className="text-2xl font-bold text-blue-900">{SYNCABLE_FIELDS.length}</div>
              </div>
              <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <div className="text-xs text-amber-700 mb-1">Diferencias</div>
                <div className="text-2xl font-bold text-amber-900">{differences.length}</div>
              </div>
              <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="text-xs text-green-700 mb-1">Seleccionados</div>
                <div className="text-2xl font-bold text-green-900">{selectedDifferences.length}</div>
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {!existingEmployee && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-900">
                    <strong>Nuevo empleado:</strong> Se creará un nuevo registro en Employee
                  </AlertDescription>
                </Alert>
              )}

              {selectedDifferences.length > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-900">
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    <strong>Resumen:</strong> {selectedDifferences.length} campo(s) serán actualizados
                  </AlertDescription>
                </Alert>
              )}

              {differences.length === 0 && existingEmployee && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-900">
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    No hay diferencias detectadas. Los datos están sincronizados.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Campos a sincronizar:</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFields(SYNCABLE_FIELDS.map(f => f.key))}
                    >
                      Todos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFields(differences)}
                    >
                      Solo Diferencias ({differences.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFields([])}
                    >
                      Ninguno
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 border rounded-lg bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-3 pr-3">
                    {SYNCABLE_FIELDS.map(field => {
                      const isDifferent = differences.includes(field.key);
                      const masterValue = masterEmployee[field.key];
                      const employeeValue = existingEmployee?.[field.key];
                      const isExpanded = expandedField === field.key;
                      const showDiff = isDifferent && (isLongText(masterValue) || isLongText(employeeValue));

                      return (
                        <div
                          key={field.key}
                          className={`p-3 rounded-lg border transition-all ${
                            isDifferent 
                              ? 'bg-amber-50 border-amber-300' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={field.key}
                              checked={selectedFields.includes(field.key)}
                              onCheckedChange={() => toggleField(field.key)}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <Label 
                                  htmlFor={field.key} 
                                  className="font-semibold cursor-pointer flex items-center gap-2"
                                >
                                  {field.label}
                                  {isDifferent && (
                                    <Badge className="bg-amber-600 text-xs">
                                      Modificado
                                    </Badge>
                                  )}
                                </Label>
                                {showDiff && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setExpandedField(isExpanded ? null : field.key)}
                                    className="h-6 px-2"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <>
                                        <Eye className="w-3 h-3 mr-1" />
                                        Ver diff
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                              
                              {isDifferent && !isExpanded && (
                                <div className="space-y-1">
                                  <div className="flex items-start gap-2 text-xs">
                                    <span className="text-slate-500 min-w-[50px]">Actual:</span>
                                    <span className="text-red-700 font-mono flex-1 break-words">
                                      {String(employeeValue || '(vacío)').substring(0, 60)}
                                      {String(employeeValue || '').length > 60 ? '...' : ''}
                                    </span>
                                  </div>
                                  <ArrowRight className="w-3 h-3 text-slate-400 ml-12" />
                                  <div className="flex items-start gap-2 text-xs">
                                    <span className="text-slate-500 min-w-[50px]">Nuevo:</span>
                                    <span className="text-green-700 font-mono font-semibold flex-1 break-words">
                                      {String(masterValue || '(vacío)').substring(0, 60)}
                                      {String(masterValue || '').length > 60 ? '...' : ''}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {isExpanded && renderDiffView(employeeValue, masterValue)}
                              
                              {!isDifferent && masterValue && (
                                <div className="text-xs text-slate-600 font-mono break-words">
                                  {String(masterValue).substring(0, 80)}
                                  {String(masterValue).length > 80 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-3">
                {syncHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No hay historial de sincronizaciones</p>
                  </div>
                ) : (
                  syncHistory.map((item, idx) => (
                    <div key={item.id} className={`p-4 rounded-lg border ${
                      item.status === 'Exitoso' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge className={item.status === 'Exitoso' ? 'bg-green-600' : 'bg-red-600'}>
                            {item.sync_type}
                          </Badge>
                          <p className="text-xs text-slate-600 mt-1">
                            {new Date(item.sync_date).toLocaleString('es-ES')}
                          </p>
                        </div>
                        {idx === 0 && item.status === 'Exitoso' && item.changes_detected && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUndoSync(item)}
                            className="border-red-300 hover:bg-red-50"
                          >
                            <Undo2 className="w-3 h-3 mr-1" />
                            Deshacer
                          </Button>
                        )}
                      </div>
                      
                      {item.fields_synced && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-700 mb-1">
                            <strong>Campos sincronizados:</strong> {item.fields_synced.length}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {item.fields_synced.slice(0, 8).map((field) => (
                              <Badge key={field} variant="outline" className="text-xs">
                                {SYNCABLE_FIELDS.find(f => f.key === field)?.label || field}
                              </Badge>
                            ))}
                            {item.fields_synced.length > 8 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.fields_synced.length - 8} más
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {item.changes_detected && Object.keys(item.changes_detected).length > 0 && (
                        <div className="mt-3 p-2 bg-white rounded border">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Cambios realizados:</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {Object.entries(item.changes_detected).slice(0, 5).map(([key, change]) => (
                              <div key={key} className="text-xs p-2 bg-slate-50 rounded">
                                <p className="font-semibold text-slate-900 mb-1">
                                  {SYNCABLE_FIELDS.find(f => f.key === key)?.label || key}
                                </p>
                                <div className="space-y-1">
                                  <div className="text-red-700">
                                    - {String(change.before || '(vacío)').substring(0, 50)}
                                  </div>
                                  <div className="text-green-700">
                                    + {String(change.after || '(vacío)').substring(0, 50)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.error_message && (
                        <Alert className="mt-2 border-red-300 bg-red-50">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription className="text-red-900 text-xs">
                            {item.error_message}
                          </AlertDescription>
                        </Alert>
                      )}

                      <p className="text-xs text-slate-500 mt-2">
                        Por: {item.synced_by || 'Sistema'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={syncing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSync} 
            disabled={syncing || selectedFields.length === 0}
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
                Sincronizar {selectedFields.length} Campo{selectedFields.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}