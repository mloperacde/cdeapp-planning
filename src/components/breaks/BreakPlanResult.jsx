import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, Factory, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function BreakPlanResult({ plan }) {
  if (!plan) return null;

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800">
            Plan generado: {plan.date} · Turno {plan.shift} · Equipo {plan.teamName}
          </p>
          {plan.resumen && (
            <p className="text-xs text-green-700">
              {plan.resumen.total_empleados} empleados · {plan.resumen.total_maquinas_activas} máquinas activas · {plan.resumen.turnos_descanso} turnos de descanso
            </p>
          )}
        </div>
      </div>

      {/* Advertencias */}
      {plan.resumen?.advertencias?.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800">Advertencias</span>
          </div>
          <ul className="text-xs text-amber-700 space-y-1 ml-6 list-disc">
            {plan.resumen.advertencias.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Turnos de descanso */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plan.breaks.map((b, idx) => {
          const totalPersonas = b.total_personas ?? (b.grupos?.reduce((s, g) => s + (g.personas?.length || 0), 0) ?? 0);
          const overCapacity = totalPersonas > (b.personas_por_turno || 9999);
          return (
            <Card key={b.id || idx} className="border border-slate-200 shadow-sm">
              <CardHeader className="py-2 px-3 border-b bg-slate-50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800">{b.nombre}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Inicio: {b.hora_inicio}</span>
                        {b.duracion_minutos && (
                          <span className="text-[11px] text-slate-400">· {b.duracion_minutos} min</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${overCapacity ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                    {totalPersonas}{b.personas_por_turno ? `/${b.personas_por_turno}` : ""} pers.
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 py-2 space-y-2">
                {(!b.grupos || b.grupos.length === 0) ? (
                  <div className="text-[11px] text-slate-400 italic">Sin asignaciones.</div>
                ) : (
                  b.grupos.map((grupo, gIdx) => (
                    <div key={gIdx} className="border border-slate-100 rounded-md overflow-hidden">
                      <div className="flex items-center gap-2 px-2 py-1 bg-slate-100">
                        <Factory className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-700 truncate">
                          {grupo.machine_nombre || grupo.machine_id || "Máquina"}
                        </span>
                        <span className="ml-auto text-[10px] text-slate-400">{grupo.personas?.length || 0} pers.</span>
                      </div>
                      <ul className="px-2 py-1 space-y-0.5">
                        {(grupo.personas || []).map((p, pIdx) => (
                          <li key={pIdx} className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-slate-800">{p.nombre || p.name || "Sin nombre"}</span>
                            <span className="text-slate-400 text-[10px]">{p.rol || ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}