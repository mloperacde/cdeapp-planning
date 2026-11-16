import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle2 } from "lucide-react";

/**
 * Resumen de la configuración de requisito de taquilla
 * (pestaña Sin Taquilla > Configuración) aplicada a la auditoría.
 */
export default function LockerRequirementSummary({ config = { mode: "all", departments: {} }, employees = [], stats = {} }) {
  const desglose = useMemo(() => {
    const activos = (employees || []).filter((e) => (e.estado_empleado || "Alta") === "Alta");
    const requiere = (emp) => {
      if (config.mode !== "config") return true;
      const deptConfig = config.departments?.[emp.departamento];
      if (!deptConfig || !deptConfig.enabled) return false;
      if (deptConfig.allPositions) return true;
      return (deptConfig.positions || []).includes(emp.puesto);
    };

    const map = new Map();
    activos.forEach((emp) => {
      const dept = emp.departamento || "Sin departamento";
      if (!map.has(dept)) map.set(dept, { dept, activos: 0, requieren: 0 });
      const row = map.get(dept);
      row.activos += 1;
      if (requiere(emp)) row.requieren += 1;
    });

    const filas = Array.from(map.values()).sort((a, b) => b.requieren - a.requieren || a.dept.localeCompare(b.dept));
    return {
      conRequisito: filas.filter((f) => f.requieren > 0),
      sinRequisito: filas.filter((f) => f.requieren === 0),
    };
  }, [employees, config]);

  const porPuestos = config.mode === "config";

  return (
    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Requisito de taquilla según configuración
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-blue-600 text-white">
            {porPuestos ? "Por departamento/puesto" : "Todos los empleados activos"}
          </Badge>
          <Badge className="bg-green-600 text-white">{stats.totalRequireLocker ?? 0} requieren</Badge>
          <Badge className="bg-slate-600 text-white">{stats.totalNoRequireLocker ?? 0} no requieren</Badge>
        </div>
      </div>

      {porPuestos ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-900 mb-1.5">
              Departamentos que requieren taquilla ({desglose.conRequisito.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {desglose.conRequisito.map((f) => (
                <span
                  key={f.dept}
                  className="px-2 py-0.5 text-xs rounded border bg-white text-slate-800 border-blue-300"
                  title={`${f.activos} activos · ${f.requieren} requieren taquilla`}
                >
                  {f.dept} <strong className="text-blue-700">({f.requieren})</strong>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5">
              Departamentos sin requisito ({desglose.sinRequisito.length})
            </p>
            {desglose.sinRequisito.length === 0 ? (
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Todos los departamentos tienen algún puesto con taquilla
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {desglose.sinRequisito.map((f) => (
                  <span
                    key={f.dept}
                    className="px-2 py-0.5 text-xs rounded border bg-white text-slate-600 border-slate-300"
                    title={`${f.activos} activos sin requisito de taquilla`}
                  >
                    {f.dept} <strong>({f.activos})</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-blue-800">
          En este modo todos los empleados activos requieren taquilla. Cambia a "Por departamento/puesto" en
          Sin Taquilla &gt; Configuración para excluir departamentos.
        </p>
      )}

      <p className="text-[11px] text-slate-600 mt-3">
        La auditoría de duplicados, fichas sin registro y taquillas no válidas se calcula solo sobre los empleados
        que requieren taquilla. Las taquillas de empleados sin requisito se muestran aparte como información.
      </p>
    </div>
  );
}