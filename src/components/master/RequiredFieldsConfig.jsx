import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { EMPLOYEE_FIELD_GROUPS, ALL_EMPLOYEE_FIELDS } from "./employeeFieldDefinitions";

const CONFIG_KEY = "employee_required_fields";

export default function RequiredFieldsConfig() {
  const queryClient = useQueryClient();
  const [selectedFields, setSelectedFields] = useState(new Set());

  // Cargar configuración existente
  const { data: configRecord, isLoading } = useQuery({
    queryKey: ['appConfig', CONFIG_KEY],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: CONFIG_KEY });
      return configs[0] || null;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (configRecord?.value) {
      try {
        const parsed = JSON.parse(configRecord.value);
        if (parsed.required_fields && Array.isArray(parsed.required_fields)) {
          setSelectedFields(new Set(parsed.required_fields));
        }
      } catch (e) {
        console.warn("Error parsing required fields config", e);
      }
    }
  }, [configRecord]);

  const saveMutation = useMutation({
    mutationFn: async (fields) => {
      const payload = {
        config_key: CONFIG_KEY,
        value: JSON.stringify({ required_fields: Array.from(fields) }),
      };

      const existing = await base44.entities.AppConfig.filter({ config_key: CONFIG_KEY });
      if (existing && existing.length > 0) {
        await base44.entities.AppConfig.update(existing[0].id, payload);
      } else {
        await base44.entities.AppConfig.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig', CONFIG_KEY] });
      queryClient.invalidateQueries({ queryKey: ['employeeRequiredFields'] });
      toast.success("Campos obligatorios guardados correctamente");
    },
    onError: (err) => toast.error("Error al guardar: " + err.message),
  });

  const toggleField = (key) => {
    const next = new Set(selectedFields);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedFields(next);
  };

  const handleSelectGroup = (groupFields, selectAll) => {
    const next = new Set(selectedFields);
    groupFields.forEach(f => {
      if (selectAll) next.add(f.key);
      else next.delete(f.key);
    });
    setSelectedFields(next);
  };

  const handleSave = () => saveMutation.mutate(selectedFields);

  const handleReset = () => setSelectedFields(new Set());

  const handleSelectAll = () => setSelectedFields(new Set(ALL_EMPLOYEE_FIELDS.map(f => f.key)));

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Configuración de Campos Obligatorios
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona qué campos deben ser obligatorios en la ficha de empleado.
              Los empleados con datos faltantes aparecerán en el reporte de datos incompletos.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {selectedFields.size} / {ALL_EMPLOYEE_FIELDS.length} obligatorios
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Acciones rápidas */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={handleSelectAll} className="h-7 text-xs">
                Marcar todos
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset} className="h-7 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" />
                Limpiar
              </Button>
            </div>

            {/* Grupos de campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(EMPLOYEE_FIELD_GROUPS).map(([groupName, fields]) => {
                const allSelected = fields.every(f => selectedFields.has(f.key));
                const someSelected = fields.some(f => selectedFields.has(f.key));
                return (
                  <div key={groupName} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{groupName}</span>
                      <button
                        onClick={() => handleSelectGroup(fields, !allSelected)}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {allSelected ? 'Quitar todos' : 'Marcar todos'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {fields.map(field => (
                        <label
                          key={field.key}
                          className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 py-0.5"
                        >
                          <Checkbox
                            checked={selectedFields.has(field.key)}
                            onCheckedChange={() => toggleField(field.key)}
                          />
                          <span className="text-xs text-slate-600 dark:text-slate-400">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón guardar */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : saveMutation.isSuccess ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar configuración
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}