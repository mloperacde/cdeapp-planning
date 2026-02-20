import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

export default function DepartmentMigrationPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [totalUpdated, setTotalUpdated] = useState(0);
  const [totalSkipped, setTotalSkipped] = useState(0);
  const [allNotFound, setAllNotFound] = useState([]);

  const runMigration = async () => {
    setRunning(true);
    setResults([]);
    setDone(false);
    setTotalUpdated(0);
    setTotalSkipped(0);
    setAllNotFound([]);

    let offset = 0;
    let hasMore = true;
    let accumulated = { updated: 0, skipped: 0, notFound: [] };

    while (hasMore) {
      const res = await base44.functions.invoke('migrateDepartmentIds', { offset });
      const data = res.data;

      accumulated.updated += data.updated || 0;
      accumulated.skipped += data.skipped || 0;
      accumulated.notFound = [...accumulated.notFound, ...(data.not_found || [])];

      setResults(prev => [...prev, { offset, ...data }]);
      setTotalUpdated(accumulated.updated);
      setTotalSkipped(accumulated.skipped);
      setAllNotFound(accumulated.notFound);

      hasMore = data.has_more;
      offset += 50;
    }

    setRunning(false);
    setDone(true);
    toast.success(`Migración completada: ${accumulated.updated} empleados actualizados`);
  };

  return (
    <Card>
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-base">
          Migración de department_id en EmployeeMasterDatabase
        </CardTitle>
        <p className="text-sm text-slate-500">
          Vincula cada empleado con el ID oficial de su departamento en la entidad Department, basándose en el campo <code>departamento</code> existente.
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <Button
          onClick={runMigration}
          disabled={running}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {running ? "Ejecutando..." : "Ejecutar Migración"}
        </Button>

        {(running || done) && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{totalUpdated}</p>
              <p className="text-xs text-green-600">Actualizados</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{totalSkipped}</p>
              <p className="text-xs text-slate-600">Sin cambios</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{allNotFound.length}</p>
              <p className="text-xs text-amber-600">Sin coincidencia</p>
            </div>
          </div>
        )}

        {done && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">Migración completada correctamente</span>
          </div>
        )}

        {allNotFound.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-700 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Empleados sin departamento coincidente ({allNotFound.length}):
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {allNotFound.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-100 text-xs">
                  <span className="font-medium">{item.empleado}</span>
                  <Badge variant="outline" className="text-amber-700">{item.departamento}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}