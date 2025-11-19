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
  Clock
} from "lucide-react";
import { toast } from "sonner";

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            Sincronización: {masterEmployee?.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!existingEmployee && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-900">
                <strong>Nuevo empleado:</strong> Se creará un nuevo registro en Employee
              </AlertDescription>
            </Alert>
          )}

          {differences.length > 0 && existingEmployee && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-900">
                <strong>{differences.length} diferencias detectadas</strong> entre la base maestra y el sistema operativo
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

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Seleccionar campos a sincronizar:</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border rounded-lg bg-slate-50">
              {SYNCABLE_FIELDS.map(field => {
                const isDifferent = differences.includes(field.key);
                const masterValue = masterEmployee[field.key];
                const employeeValue = existingEmployee?.[field.key];

                return (
                  <div
                    key={field.key}
                    className={`p-3 rounded-lg border ${
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
                      <div className="flex-1">
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
                        
                        {isDifferent && (
                          <div className="mt-2 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Actual:</span>
                              <span className="text-red-700 font-mono">
                                {employeeValue || '(vacío)'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Nuevo:</span>
                              <span className="text-green-700 font-mono font-semibold">
                                {masterValue || '(vacío)'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {!isDifferent && masterValue && (
                          <div className="mt-1 text-xs text-slate-600 font-mono">
                            {String(masterValue).substring(0, 40)}
                            {String(masterValue).length > 40 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
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