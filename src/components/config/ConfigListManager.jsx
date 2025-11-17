import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function ConfigListManager({ configKey, config }) {
  const [newValue, setNewValue] = useState("");
  const queryClient = useQueryClient();

  const { data: globalConfig } = useQuery({
    queryKey: ['globalConfig', configKey],
    queryFn: async () => {
      const configs = await base44.entities.GlobalConfig.filter({ config_key: configKey });
      return configs[0] || { config_key: configKey, valores: [], activo: true };
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (globalConfig?.id) {
        return base44.entities.GlobalConfig.update(globalConfig.id, data);
      }
      return base44.entities.GlobalConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalConfig'] });
      toast.success("Configuración guardada correctamente");
    }
  });

  const handleAddValue = () => {
    if (!newValue.trim()) {
      toast.error("El valor no puede estar vacío");
      return;
    }

    const valores = globalConfig?.valores || [];
    if (valores.includes(newValue.trim())) {
      toast.error("Este valor ya existe");
      return;
    }

    saveMutation.mutate({
      ...globalConfig,
      valores: [...valores, newValue.trim()]
    });
    setNewValue("");
  };

  const handleRemoveValue = (value) => {
    const valores = globalConfig?.valores || [];
    saveMutation.mutate({
      ...globalConfig,
      valores: valores.filter(v => v !== value)
    });
  };

  const Icon = config.icon;
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    indigo: "from-indigo-500 to-indigo-600",
    pink: "from-pink-500 to-pink-600"
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[config.color]} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle>{config.label}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">{config.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Nuevo Valor</Label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddValue()}
                placeholder={`Ej: ${config.key === 'departamentos' ? 'Producción' : config.key === 'tipos_contrato' ? 'Indefinido' : 'Nuevo valor'}`}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddValue} disabled={saveMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Valores Configurados ({globalConfig?.valores?.length || 0})</Label>
            <div className="flex flex-wrap gap-2">
              {(globalConfig?.valores || []).map((valor, index) => (
                <Badge key={index} variant="outline" className="px-3 py-2 text-sm">
                  {valor}
                  <button
                    onClick={() => handleRemoveValue(valor)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {(globalConfig?.valores?.length === 0 || !globalConfig?.valores) && (
                <p className="text-sm text-slate-500 italic">No hay valores configurados</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              <strong>ℹ️ Nota:</strong> Los valores configurados aquí aparecerán automáticamente en los formularios 
              correspondientes de empleados, ausencias y otros módulos.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}