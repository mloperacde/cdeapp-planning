import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function VacationAccumulationConfig() {
  const [editingTypes, setEditingTypes] = useState({});
  const queryClient = useQueryClient();

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  React.useEffect(() => {
    const typeMap = {};
    absenceTypes.forEach(type => {
      typeMap[type.id] = {
        id: type.id,
        no_consume_vacaciones: type.no_consume_vacaciones ?? true,
        permite_acumulacion: type.permite_acumulacion || false,
        dias_maximos_acumulacion: type.dias_maximos_acumulacion || 0,
        caducidad_dias_acumulados: type.caducidad_dias_acumulados || 365,
        requiere_aprobacion_acumulacion: type.requiere_aprobacion_acumulacion || false
      };
    });
    setEditingTypes(typeMap);
  }, [absenceTypes]);

  const saveMutation = useMutation({
    mutationFn: async (typesToSave) => {
      const promises = Object.values(typesToSave).map(type => 
        base44.entities.AbsenceType.update(type.id, {
          no_consume_vacaciones: type.no_consume_vacaciones,
          permite_acumulacion: type.permite_acumulacion,
          dias_maximos_acumulacion: type.dias_maximos_acumulacion,
          caducidad_dias_acumulados: type.caducidad_dias_acumulados,
          requiere_aprobacion_acumulacion: type.requiere_aprobacion_acumulacion
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
      toast.success("Configuración de vacaciones guardada");
    },
  });

  const updateType = (typeId, field, value) => {
    setEditingTypes(prev => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(editingTypes);
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Información:</strong> Configura cómo se gestionan las vacaciones no disfrutadas. 
            Define si un tipo de ausencia genera días pendientes cuando coincide con vacaciones, 
            límites de acumulación y caducidad.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Gestión de Vacaciones por Tipo de Ausencia
            </CardTitle>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {absenceTypes.map((type) => {
              const config = editingTypes[type.id] || {};
              
              return (
                <div key={type.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{type.nombre}</h3>
                      <p className="text-xs text-slate-600">
                        {type.categoria_principal} - {type.subcategoria}
                      </p>
                    </div>
                    <Badge className={type.remunerada ? 'bg-green-600' : 'bg-slate-600'}>
                      {type.remunerada ? 'Remunerada' : 'No Remunerada'}
                    </Badge>
                  </div>

                  <div className="space-y-3 pl-4 border-l-2 border-blue-300">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`no-consume-${type.id}`}
                        checked={config.no_consume_vacaciones || false}
                        onCheckedChange={(checked) => updateType(type.id, 'no_consume_vacaciones', checked)}
                      />
                      <label htmlFor={`no-consume-${type.id}`} className="text-sm font-medium cursor-pointer">
                        No consume vacaciones (genera días pendientes si coincide con vacaciones)
                      </label>
                    </div>

                    {config.no_consume_vacaciones && (
                      <div className="ml-6 space-y-3 p-3 bg-white rounded border border-blue-200">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`permite-acum-${type.id}`}
                            checked={config.permite_acumulacion || false}
                            onCheckedChange={(checked) => updateType(type.id, 'permite_acumulacion', checked)}
                          />
                          <label htmlFor={`permite-acum-${type.id}`} className="text-sm font-medium cursor-pointer">
                            Permite acumulación de días
                          </label>
                        </div>

                        {config.permite_acumulacion && (
                          <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Días máximos acumulables</Label>
                              <Input
                                type="number"
                                value={config.dias_maximos_acumulacion || 0}
                                onChange={(e) => updateType(type.id, 'dias_maximos_acumulacion', parseInt(e.target.value))}
                                placeholder="Ej: 30"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Caducidad (días)</Label>
                              <Input
                                type="number"
                                value={config.caducidad_dias_acumulados || 365}
                                onChange={(e) => updateType(type.id, 'caducidad_dias_acumulados', parseInt(e.target.value))}
                                placeholder="Ej: 365"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Aprobación</Label>
                              <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                  id={`req-aprob-${type.id}`}
                                  checked={config.requiere_aprobacion_acumulacion || false}
                                  onCheckedChange={(checked) => updateType(type.id, 'requiere_aprobacion_acumulacion', checked)}
                                />
                                <label htmlFor={`req-aprob-${type.id}`} className="text-xs cursor-pointer">
                                  Requiere aprobación para acumular
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Ejemplo de Funcionamiento:</p>
              <p className="text-xs">
                Si marcas "Baja médica" como "No consume vacaciones", cuando un empleado esté de baja durante
                sus vacaciones programadas, esos días se acumularán como "días pendientes" que podrá disfrutar
                posteriormente. Puedes limitar cuántos días se pueden acumular y cuándo caducan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}