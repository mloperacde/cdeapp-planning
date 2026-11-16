import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Copy, FileWarning, UserX } from "lucide-react";

const SOURCE_LABEL = {
  modulo: "Módulo",
  ficha: "Solo ficha",
};

const TIPO_LABEL = {
  solo_ficha: { text: "Ficha sin registro en módulo", className: "bg-red-600 text-white" },
  discrepancia: { text: "Datos distintos", className: "bg-amber-600 text-white" },
};

export default function LockerAuditIssues({
  duplicadas = [],
  desincronizadas = [],
  fueraCatalogo = [],
  vestuariosInvalidos = [],
  huerfanas = [],
  onSyncFromFicha,
  onDeleteOrphans,
  syncPending = false,
  deletePending = false,
}) {
  const sincronizables = desincronizadas.filter(
    (d) => d.activo && d.fichaNumero && d.tipo !== "solo_modulo"
  );
  const soloModulo = desincronizadas.filter((d) => d.tipo === "solo_modulo");

  return (
    <div className="space-y-4">
      {/* Duplicados */}
      {duplicadas.length > 0 && (
        <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
          <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-3">
            <Copy className="w-4 h-4" />
            Taquillas duplicadas ({duplicadas.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {duplicadas.map((dup) => (
              <div key={`${dup.vestuario}-${dup.numero}`} className="p-3 bg-white rounded border-2 border-red-200">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className="bg-red-600 text-white">Taquilla {dup.numero}</Badge>
                  <Badge variant="outline">{dup.vestuario}</Badge>
                  <Badge className="bg-orange-600 text-white">
                    {new Set(dup.entries.map((e) => String(e.employeeId))).size} empleados
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dup.entries.map((e) => (
                    <span
                      key={`${e.employeeId}-${e.source}`}
                      className="px-2 py-0.5 text-xs rounded border bg-slate-50 text-slate-800 border-slate-300"
                      title={e.source === "ficha" ? "Asignada solo en la ficha del empleado" : "Asignada en el módulo de vestuarios"}
                    >
                      {e.nombre}
                      <span className={`ml-1 font-semibold ${e.source === "ficha" ? "text-amber-700" : "text-blue-700"}`}>
                        · {SOURCE_LABEL[e.source]}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-800 mt-2">
            Los duplicados marcados como <strong>“Solo ficha”</strong> están configurados en la ficha del empleado
            pero no tienen registro en el módulo: regístralos desde la sincronización o corrígelos en la ficha.
          </p>
        </div>
      )}

      {/* Desincronizadas ficha <-> modulo */}
      {sincronizables.length > 0 && (
        <div className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="font-semibold text-amber-900 flex items-center gap-2">
              <FileWarning className="w-4 h-4" />
              Ficha y módulo no coinciden ({sincronizables.length})
            </h3>
            {onSyncFromFicha && (
              <button
                type="button"
                onClick={() => onSyncFromFicha(sincronizables)}
                disabled={syncPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {syncPending ? "Sincronizando..." : "Llevar fichas al módulo"}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-amber-900 border-b border-amber-300">
                  <th className="py-1.5 pr-3 font-semibold">Empleado</th>
                  <th className="py-1.5 pr-3 font-semibold">Ficha del empleado</th>
                  <th className="py-1.5 pr-3 font-semibold">Módulo de vestuarios</th>
                  <th className="py-1.5 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sincronizables.map((d) => (
                  <tr key={d.employeeId} className="border-b border-amber-200/70 last:border-0">
                    <td className="py-1.5 pr-3">
                      <span className="font-semibold text-slate-900">{d.nombre}</span>
                      {d.codigo && <span className="text-slate-500"> · {d.codigo}</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-800">
                      {d.fichaNumero ? `${d.fichaVestuario || "Sin vestuario"} · ${d.fichaNumero}` : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-800">
                      {d.moduloNumero ? `${d.moduloVestuario || "Sin vestuario"} · ${d.moduloNumero}` : "Sin registro"}
                    </td>
                    <td className="py-1.5">
                      <Badge className={TIPO_LABEL[d.tipo]?.className || "bg-slate-600 text-white"}>
                        {TIPO_LABEL[d.tipo]?.text || d.tipo}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {soloModulo.length > 0 && (
            <p className="text-xs text-amber-800 mt-2">
              Además, {soloModulo.length} asignación(es) del módulo no están reflejadas en la ficha del empleado.
            </p>
          )}
        </div>
      )}

      {/* Fuera de catalogo / vestuarios no validos */}
      {(fueraCatalogo.length > 0 || vestuariosInvalidos.length > 0) && (
        <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
          <h3 className="font-semibold text-orange-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Taquillas o vestuarios no válidos
          </h3>
          {fueraCatalogo.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-orange-900 mb-1">
                Número que no existe en el vestuario ({fueraCatalogo.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fueraCatalogo.map((e) => (
                  <span
                    key={`${e.employeeId}-${e.source}`}
                    className="px-2 py-0.5 text-xs rounded border bg-white text-slate-800 border-orange-300"
                  >
                    {e.nombre} · {e.vestuario} · {e.numero}
                  </span>
                ))}
              </div>
            </div>
          )}
          {vestuariosInvalidos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-900 mb-1">
                Vestuario no reconocido ({vestuariosInvalidos.length})
              </p>
              <div className="space-y-1">
                {vestuariosInvalidos.map((v) => (
                  <div key={v.vestuario} className="text-xs text-slate-800">
                    <Badge variant="outline" className="border-orange-400 mr-2">{v.vestuario}</Badge>
                    {v.nombres.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Huerfanas */}
      {huerfanas.length > 0 && (
        <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <UserX className="w-4 h-4" />
              Asignaciones huérfanas ({huerfanas.length})
            </h3>
            {onDeleteOrphans && (
              <button
                type="button"
                onClick={() => onDeleteOrphans(huerfanas)}
                disabled={deletePending}
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletePending ? "Eliminando..." : "Eliminar huérfanas"}
              </button>
            )}
          </div>
          <p className="text-xs text-red-800 mb-2">
            Asignaciones cuyo empleado ya no existe en la base maestra.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {huerfanas.slice(0, 20).map((la) => (
              <span key={la.id} className="px-2 py-0.5 text-xs rounded border bg-white text-slate-800 border-red-300">
                {la.vestuario || "Sin vestuario"} · {la.numero_taquilla_actual || "—"}
              </span>
            ))}
            {huerfanas.length > 20 && (
              <span className="text-xs text-red-700">+{huerfanas.length - 20} más</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}