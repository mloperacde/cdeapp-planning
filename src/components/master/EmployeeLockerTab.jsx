import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { cleanLockerNumber } from "@/utils";

export const VESTUARIOS = [
  "Vestuario Femenino Planta Baja",
  "Vestuario Femenino Planta Alta",
  "Vestuario Masculino Planta Baja",
];

const SIN_TAQUILLA = "__sin_taquilla__";

export default function EmployeeLockerTab({ formData, setFormData, employeeId }) {
  const { data: lockerRoomConfigs = [] } = useQuery({
    queryKey: ['lockerRoomConfigs'],
    queryFn: () => base44.entities.LockerRoomConfig.list(),
    initialData: [],
    staleTime: 60000,
  });

  const { data: lockerAssignments = [] } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
    staleTime: 30000,
  });

  const vestuario = formData.taquilla_vestuario || "";
  const numero = cleanLockerNumber(formData.taquilla_numero);

  const config = lockerRoomConfigs.find(c => c.vestuario === vestuario);
  const identificadores = config?.identificadores_taquillas || [];

  const ocupantes = (() => {
    const map = {};
    for (const a of lockerAssignments) {
      if (a.requiere_taquilla === false) continue;
      if ((a.vestuario || "") !== vestuario) continue;
      const id = cleanLockerNumber(a.numero_taquilla_actual);
      if (id) map[id] = a.employee_id;
    }
    return map;
  })();

  const ocupadaPorOtro = (id) => ocupantes[id] && String(ocupantes[id]) !== String(employeeId);

  const setVestuario = (value) => {
    setFormData({ ...formData, taquilla_vestuario: value, taquilla_numero: "" });
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vestuario</Label>
          <Select value={vestuario} onValueChange={setVestuario}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar vestuario" />
            </SelectTrigger>
            <SelectContent>
              {VESTUARIOS.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Número Taquilla</Label>
          {identificadores.length > 0 ? (
            <Select
              value={numero || SIN_TAQUILLA}
              onValueChange={(value) => setFormData({
                ...formData,
                taquilla_numero: value === SIN_TAQUILLA ? "" : value,
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar taquilla" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_TAQUILLA}>Sin taquilla</SelectItem>
                {identificadores.map(id => (
                  <SelectItem key={id} value={id} disabled={ocupadaPorOtro(id)}>
                    {id}{ocupadaPorOtro(id) ? " · ocupada" : ""}
                  </SelectItem>
                ))}
                {numero && !identificadores.includes(numero) && (
                  <SelectItem value={numero}>{numero} · fuera de catálogo</SelectItem>
                )}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={formData.taquilla_numero || ""}
              onChange={(e) => setFormData({ ...formData, taquilla_numero: e.target.value })}
              placeholder={vestuario ? "Ej: 101, A-15, etc." : "Selecciona primero un vestuario"}
              disabled={!vestuario}
            />
          )}
          {vestuario && identificadores.length > 0 && (
            <p className="text-xs text-slate-500">
              {identificadores.length} taquillas configuradas en este vestuario.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <RefreshCw className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          La asignación se sincroniza automáticamente con el módulo de Vestuarios y Taquillas al guardar.
        </p>
      </div>
    </div>
  );
}