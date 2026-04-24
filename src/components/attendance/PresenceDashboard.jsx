import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Pause, CheckCircle, Building2, Wrench, RefreshCw, Clock, AlertTriangle } from "lucide-react";

const STATUS_CONFIG = {
  Presente: { label: "Presente", color: "bg-green-500", badge: "bg-green-100 text-green-800" },
  "En Pausa": { label: "En Pausa", color: "bg-amber-400", badge: "bg-amber-100 text-amber-800" },
  Completado: { label: "Completado", color: "bg-slate-400", badge: "bg-slate-100 text-slate-600" },
  Ausente: { label: "Ausente", color: "bg-red-500", badge: "bg-red-100 text-red-800" }
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PresenceDashboard({ date }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState("departments");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await base44.functions.invoke("getAttendanceSummary", { date });
    setData(res.data);
    setLastUpdate(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3 * 60 * 1000); // auto-refresh cada 3 min
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data && loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-muted-foreground">Cargando datos de presencia...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Panel de Presencia en Tiempo Real</h2>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Actualizado: {lastUpdate} · Auto-refresco cada 3 min
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Presentes Ahora" value={data.total_present} color="bg-green-600" />
        <StatCard icon={Pause} label="En Pausa/Vestuario" value={data.total_on_break} color="bg-amber-500" />
        <StatCard icon={CheckCircle} label="Turno Completado" value={data.total_completed} color="bg-slate-500" />
        <StatCard icon={AlertTriangle} label="Sin Fichaje" value={
          (data.present_employees?.filter(e => !e.entry_time).length || 0)
        } color="bg-red-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("departments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "departments" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Building2 className="w-4 h-4 inline mr-1" />
          Por Departamento y Turno
        </button>
        <button
          onClick={() => setActiveTab("machines")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "machines" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Wrench className="w-4 h-4 inline mr-1" />
          Disponibilidad por Máquina
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "list" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="w-4 h-4 inline mr-1" />
          Lista Completa
        </button>
      </div>

      {/* Tab: Departamentos */}
      {activeTab === "departments" && (
        <div className="space-y-3">
          {Object.entries(data.by_department_shift || {}).map(([dept, shifts]) => {
            const total = Object.values(shifts).flat().length;
            return (
              <Card key={dept}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      {dept}
                    </span>
                    <Badge variant="outline">{total} presentes</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {["Mañana", "Tarde", "Noche"].map(shift => {
                      const emps = shifts[shift] || [];
                      if (emps.length === 0) return null;
                      return (
                        <div key={shift} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Turno {shift} · {emps.length} persona{emps.length !== 1 ? "s" : ""}
                          </p>
                          <div className="space-y-1">
                            {emps.map((e, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[e.status]?.color || "bg-slate-400"}`} />
                                <span className="text-xs truncate">{e.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {Object.keys(data.by_department_shift || {}).length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              No hay empleados presentes registrados para esta fecha
            </div>
          )}
        </div>
      )}

      {/* Tab: Máquinas */}
      {activeTab === "machines" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data.machine_availability || []).map(machine => {
            const hasOperators = machine.present_qualified > 0;
            return (
              <Card key={machine.machine_id} className={`border-l-4 ${hasOperators ? "border-l-green-500" : "border-l-red-400"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{machine.machine_name}</p>
                      <p className="text-xs text-muted-foreground">{machine.machine_code} · {machine.area}</p>
                    </div>
                    <Badge className={hasOperators ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {machine.present_qualified} / {machine.total_qualified}
                    </Badge>
                  </div>
                  {machine.operators.length > 0 ? (
                    <div className="space-y-1 mt-2">
                      {machine.operators.slice(0, 4).map((op, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                            {op.priority}
                          </span>
                          <span className="truncate flex-1">{op.name}</span>
                          <span className="text-muted-foreground shrink-0">{op.level}</span>
                        </div>
                      ))}
                      {machine.operators.length > 4 && (
                        <p className="text-xs text-muted-foreground">+{machine.operators.length - 4} más...</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-red-600 mt-2">⚠️ Sin operadores cualificados presentes</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab: Lista completa */}
      {activeTab === "list" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 px-3">Empleado</th>
                <th className="text-left py-2 px-3">Departamento</th>
                <th className="text-left py-2 px-3">Turno</th>
                <th className="text-left py-2 px-3">Entrada</th>
                <th className="text-left py-2 px-3">Salida</th>
                <th className="text-left py-2 px-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(data.present_employees || []).map((emp, i) => {
                const sc = STATUS_CONFIG[emp.status] || STATUS_CONFIG.Presente;
                return (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{emp.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{emp.department}</td>
                    <td className="py-2 px-3">{emp.shift}</td>
                    <td className="py-2 px-3">{emp.entry_time || "—"}</td>
                    <td className="py-2 px-3">{emp.exit_time || "—"}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.badge}`}>
                        {sc.label}
                        {emp.statusDetail ? ` · ${emp.statusDetail}` : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!data.present_employees || data.present_employees.length === 0) && (
            <div className="text-center py-10 text-muted-foreground">No hay datos de presencia</div>
          )}
        </div>
      )}
    </div>
  );
}