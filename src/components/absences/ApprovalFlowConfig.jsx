import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, GitFork, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function ApprovalFlowConfig() {
  const [editingFlows, setEditingFlows] = useState({});
  const queryClient = useQueryClient();

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const { data: approvalFlows = [] } = useQuery({
    queryKey: ['absenceApprovalFlows'],
    queryFn: () => base44.entities.AbsenceApprovalFlow.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (flows) => {
      const promises = flows.map(flow => {
        if (flow.id) {
          return base44.entities.AbsenceApprovalFlow.update(flow.id, flow);
        } else {
          return base44.entities.AbsenceApprovalFlow.create(flow);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceApprovalFlows'] });
      toast.success("Flujos de aprobación guardados");
      setEditingFlows({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AbsenceApprovalFlow.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceApprovalFlows'] });
      toast.success("Flujo eliminado");
    },
  });

  const addLevel = (absenceTypeId) => {
    const currentFlow = editingFlows[absenceTypeId] || 
      approvalFlows.find(f => f.absence_type_id === absenceTypeId) || 
      { absence_type_id: absenceTypeId, niveles: [] };

    const newLevel = {
      nivel: (currentFlow.niveles?.length || 0) + 1,
      rol_aprobador: "admin",
      auto_aprobar_si: null
    };

    setEditingFlows({
      ...editingFlows,
      [absenceTypeId]: {
        ...currentFlow,
        niveles: [...(currentFlow.niveles || []), newLevel]
      }
    });
  };

  const removeLevel = (absenceTypeId, index) => {
    const currentFlow = editingFlows[absenceTypeId];
    if (!currentFlow) return;

    const updatedLevels = currentFlow.niveles.filter((_, i) => i !== index);
    setEditingFlows({
      ...editingFlows,
      [absenceTypeId]: {
        ...currentFlow,
        niveles: updatedLevels
      }
    });
  };

  const updateLevel = (absenceTypeId, index, field, value) => {
    const currentFlow = editingFlows[absenceTypeId] || 
      approvalFlows.find(f => f.absence_type_id === absenceTypeId);
    
    if (!currentFlow) return;

    const updatedLevels = [...(currentFlow.niveles || [])];
    updatedLevels[index] = {
      ...updatedLevels[index],
      [field]: value
    };

    setEditingFlows({
      ...editingFlows,
      [absenceTypeId]: {
        ...currentFlow,
        niveles: updatedLevels
      }
    });
  };

  const handleSave = () => {
    const flowsToSave = Object.values(editingFlows);
    if (flowsToSave.length === 0) {
      toast.error("No hay cambios para guardar");
      return;
    }
    saveMutation.mutate(flowsToSave);
  };

  const getFlowForType = (absenceTypeId) => {
    return editingFlows[absenceTypeId] || 
           approvalFlows.find(f => f.absence_type_id === absenceTypeId);
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Información:</strong> Configura flujos de aprobación multinivel para cada tipo de ausencia.
            Puedes definir diferentes aprobadores por nivel y condiciones de auto-aprobación.
          </p>
        </CardContent>
      </Card>

      {Object.keys(editingFlows).length > 0 && (
        <Card className="bg-green-50 border-2 border-green-300">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-green-900 font-semibold">
                Hay cambios sin guardar
              </p>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {absenceTypes.map((absenceType) => {
          const flow = getFlowForType(absenceType.id);
          const hasFlow = flow && flow.niveles && flow.niveles.length > 0;

          return (
            <Card key={absenceType.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitFork className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-base">{absenceType.nombre}</CardTitle>
                      <p className="text-xs text-slate-600 mt-1">
                        {absenceType.categoria_principal} - {absenceType.subcategoria}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => addLevel(absenceType.id)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Nivel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!hasFlow ? (
                  <div className="text-center py-8 text-slate-500">
                    <GitFork className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No hay flujo de aprobación configurado</p>
                    <p className="text-xs">Haz clic en "Añadir Nivel" para crear uno</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flow.niveles.map((nivel, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <Badge className="bg-blue-600">
                          Nivel {nivel.nivel}
                        </Badge>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Rol Aprobador</Label>
                            <Select
                              value={nivel.rol_aprobador}
                              onValueChange={(value) => updateLevel(absenceType.id, index, 'rol_aprobador', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                <SelectItem value="jefe_turno">Jefe de Turno</SelectItem>
                                <SelectItem value="rrhh">RRHH</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Auto-aprobar si (opcional)</Label>
                            <Select
                              value={nivel.auto_aprobar_si || "ninguno"}
                              onValueChange={(value) => updateLevel(absenceType.id, index, 'auto_aprobar_si', value === "ninguno" ? null : value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ninguno">Sin auto-aprobación</SelectItem>
                                <SelectItem value="duracion_menor_1_dia">Duración {'<'} 1 día</SelectItem>
                                <SelectItem value="duracion_menor_3_dias">Duración {'<'} 3 días</SelectItem>
                                <SelectItem value="empleado_senior">Empleado senior ({'>'} 5 años)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLevel(absenceType.id, index)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}