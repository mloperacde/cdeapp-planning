import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Save, Building2, Users } from "lucide-react";
import { usePersistentAppConfig } from "@/hooks/usePersistentAppConfig";

const DEFAULT_CONFIG = { mode: "all", departments: {} };

export default function LockerRequirementConfig({ employees }) {
  const { data: config = DEFAULT_CONFIG, save, isSaving } = usePersistentAppConfig(
    "locker_requirement_config",
    DEFAULT_CONFIG,
    "lockerRequirementConfig",
    false,
    { enabled: true }
  );

  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const deptPositionMap = useMemo(() => {
    const map = {};
    (employees || []).forEach(emp => {
      if (!emp.departamento) return;
      if (!map[emp.departamento]) map[emp.departamento] = new Set();
      if (emp.puesto) map[emp.departamento].add(emp.puesto);
    });
    return map;
  }, [employees]);

  const departments = useMemo(() => Object.keys(deptPositionMap).sort(), [deptPositionMap]);

  const handleToggleMode = (mode) => {
    setLocalConfig(prev => ({ ...prev, mode }));
  };

  const handleToggleDept = (dept, enabled) => {
    setLocalConfig(prev => ({
      ...prev,
      departments: {
        ...prev.departments,
        [dept]: {
          enabled,
          allPositions: prev.departments[dept]?.allPositions ?? true,
          positions: prev.departments[dept]?.positions ?? []
        }
      }
    }));
  };

  const handleToggleAllPositions = (dept, allPositions) => {
    setLocalConfig(prev => ({
      ...prev,
      departments: {
        ...prev.departments,
        [dept]: { ...prev.departments[dept], allPositions }
      }
    }));
  };

  const handleTogglePosition = (dept, position, checked) => {
    setLocalConfig(prev => {
      const deptConfig = prev.departments[dept] || { enabled: true, allPositions: false, positions: [] };
      const positions = new Set(deptConfig.positions || []);
      if (checked) positions.add(position);
      else positions.delete(position);
      return {
        ...prev,
        departments: {
          ...prev.departments,
          [dept]: { ...deptConfig, positions: Array.from(positions) }
        }
      };
    });
  };

  const requiredCount = useMemo(() => {
    return (employees || []).filter(emp => {
      if ((emp.estado_empleado || "Alta") !== "Alta") return false;
      if (localConfig.mode !== "config") return true;
      const deptConfig = localConfig.departments?.[emp.departamento];
      if (!deptConfig || !deptConfig.enabled) return false;
      if (deptConfig.allPositions) return true;
      return (deptConfig.positions || []).includes(emp.puesto);
    }).length;
  }, [employees, localConfig]);

  const handleSave = async () => {
    await save(localConfig);
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Configuración de Requisito de Taquilla
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex gap-2">
          <Button
            variant={localConfig.mode !== "config" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToggleMode("all")}
            className="flex-1"
          >
            Todos los empleados
          </Button>
          <Button
            variant={localConfig.mode === "config" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToggleMode("config")}
            className="flex-1"
          >
            Por departamento/puesto
          </Button>
        </div>

        {localConfig.mode === "config" ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecciona qué departamentos y puestos requieren taquilla. Los empleados no incluidos no aparecerán en la lista de "Sin Taquilla".
            </p>
            {departments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hay departamentos cargados.</p>
            ) : (
              departments.map(dept => {
                const deptConfig = localConfig.departments?.[dept] || { enabled: false, allPositions: true, positions: [] };
                const positions = Array.from(deptPositionMap[dept] || []).sort();
                const activeInDept = (employees || []).filter(e => e.departamento === dept && (e.estado_empleado || "Alta") === "Alta").length;
                return (
                  <div key={dept} className="border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={deptConfig.enabled || false}
                          onCheckedChange={(checked) => handleToggleDept(dept, checked)}
                        />
                        <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{dept}</span>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">{activeInDept} emp.</Badge>
                      </div>
                      {deptConfig.enabled && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Label className="text-xs text-slate-500">Todos los puestos</Label>
                          <Switch
                            checked={deptConfig.allPositions}
                            onCheckedChange={(checked) => handleToggleAllPositions(dept, checked)}
                          />
                        </div>
                      )}
                    </div>
                    {deptConfig.enabled && !deptConfig.allPositions && positions.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-7">
                        {positions.map(pos => {
                          const checked = (deptConfig.positions || []).includes(pos);
                          return (
                            <label key={pos} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => handleTogglePosition(dept, pos, c)}
                              />
                              <span>{pos}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Modo actual: todos los empleados activos requieren taquilla. Cambia a "Por departamento/puesto" para definir reglas específicas.
          </p>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {requiredCount} empleados requieren taquilla
            </Badge>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}