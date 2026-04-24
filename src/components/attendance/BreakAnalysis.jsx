import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Coffee, Clock, Play, BarChart2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BREAK_COLORS = {
  "VESTUARIOS/ASEOS": "bg-blue-100 text-blue-800",
  "VESTUARIOS": "bg-blue-100 text-blue-800",
  "ASEOS": "bg-cyan-100 text-cyan-800",
  "DESCANSO": "bg-orange-100 text-orange-800",
};

function getBreakColor(type) {
  return BREAK_COLORS[type?.toUpperCase()] || "bg-purple-100 text-purple-800";
}

export default function BreakAnalysis({ date }) {
  const [breaks, setBreaks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const fetchBreaks = useCallback(async () => {
    setLoading(true);
    const records = await base44.entities.BreakRecord.filter({ record_date: date }, "-duration_minutes", 500);
    setBreaks(records);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchBreaks(); }, [fetchBreaks]);

  const processDay = async (dryRun = false) => {
    setProcessing(true);
    const res = await base44.functions.invoke("processAttendanceBreaks", { date, dry_run: dryRun });
    setProcessing(false);
    if (res.data?.success) {
      toast.success(`Procesado: ${res.data.breaks_detected} interrupciones detectadas, ${res.data.breaks_saved} guardadas`);
      if (!dryRun) fetchBreaks();
    } else {
      toast.error("Error al procesar: " + (res.data?.error || "Error desconocido"));
    }
  };

  // Estadísticas
  const totalBreaks = breaks.length;
  const totalMinutes = breaks.reduce((s, b) => s + (b.duration_minutes || 0), 0);
  const avgDuration = totalBreaks > 0 ? Math.round(totalMinutes / totalBreaks) : 0;
  const uniqueEmployees = new Set(breaks.map(b => b.employee_code)).size;

  const breakTypes = [...new Set(breaks.map(b => b.break_type).filter(Boolean))];

  const filtered = breaks.filter(b => {
    const matchSearch = !search || b.employee_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || b.break_type === filterType;
    return matchSearch && matchType;
  });

  // Agrupación por tipo para el resumen
  const byType = {};
  breaks.forEach(b => {
    const t = b.break_type || "OTRO";
    if (!byType[t]) byType[t] = { count: 0, totalMin: 0 };
    byType[t].count++;
    byType[t].totalMin += b.duration_minutes || 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">Auditoría de Interrupciones</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => processDay(true)} disabled={processing}>
            {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            Simular
          </Button>
          <Button size="sm" onClick={() => processDay(false)} disabled={processing} className="bg-blue-600 hover:bg-blue-700">
            {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Procesar Fichajes
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Coffee className="w-8 h-8 text-orange-500" />
          <div><p className="text-xl font-bold">{totalBreaks}</p><p className="text-xs text-muted-foreground">Total Interrupciones</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-500" />
          <div><p className="text-xl font-bold">{avgDuration} min</p><p className="text-xs text-muted-foreground">Duración Media</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <BarChart2 className="w-8 h-8 text-purple-500" />
          <div><p className="text-xl font-bold">{Math.round(totalMinutes / 60 * 10) / 10}h</p><p className="text-xs text-muted-foreground">Tiempo Total</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <RefreshCw className="w-8 h-8 text-green-500" />
          <div><p className="text-xl font-bold">{uniqueEmployees}</p><p className="text-xs text-muted-foreground">Empleados con Pausas</p></div>
        </CardContent></Card>
      </div>

      {/* Resumen por tipo */}
      {Object.keys(byType).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byType).map(([type, stats]) => (
            <div key={type} className={`px-3 py-2 rounded-lg text-sm ${getBreakColor(type)}`}>
              <span className="font-semibold">{type}:</span>{" "}
              {stats.count} pausas · {Math.round(stats.totalMin)} min total · media {Math.round(stats.totalMin / stats.count)} min
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Buscar empleado..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="all">Todos los tipos</option>
          {breakTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Tabla de interrupciones */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 px-3">Empleado</th>
                <th className="text-left py-2 px-3">Departamento</th>
                <th className="text-left py-2 px-3">Turno</th>
                <th className="text-left py-2 px-3">Tipo</th>
                <th className="text-left py-2 px-3">Inicio</th>
                <th className="text-left py-2 px-3">Fin</th>
                <th className="text-right py-2 px-3">Duración</th>
                <th className="text-left py-2 px-3">Jornada</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">{b.employee_name}</td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">{b.department}</td>
                  <td className="py-2 px-3 text-xs">{b.shift}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBreakColor(b.break_type)}`}>
                      {b.break_type}
                    </span>
                  </td>
                  <td className="py-2 px-3">{b.break_start}</td>
                  <td className="py-2 px-3">{b.break_end || "—"}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`font-semibold ${(b.duration_minutes || 0) > 15 ? "text-orange-600" : "text-green-600"}`}>
                      {b.duration_minutes} min
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">
                    {b.work_session_start} → {b.work_session_end || "activo"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              {breaks.length === 0
                ? "Sin datos. Pulsa 'Procesar Fichajes' para analizar el día."
                : "No hay interrupciones que coincidan con los filtros."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}