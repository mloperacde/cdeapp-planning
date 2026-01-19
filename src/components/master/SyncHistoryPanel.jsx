import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SyncHistoryPanel({ masterEmployeeId }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['syncHistory', masterEmployeeId],
    queryFn: () => base44.entities.EmployeeSyncHistory.filter({
      master_employee_id: masterEmployeeId
    }, '-sync_date'),
    initialData: [],
    enabled: !!masterEmployeeId
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">Cargando historial...</div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>No hay historial de sincronización</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Historial de Sincronización ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.map((entry) => (
            <div key={entry.id} className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {entry.status === 'Exitoso' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{entry.sync_type}</p>
                    <p className="text-xs text-slate-600">
                      {(() => {
                        try {
                          const date = new Date(entry.sync_date);
                          if (isNaN(date.getTime())) return '-';
                          return format(date, "d MMM yyyy, HH:mm", { locale: es });
                        } catch {
                          return '-';
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <Badge className={entry.status === 'Exitoso' ? 'bg-green-600' : 'bg-red-600'}>
                  {entry.status}
                </Badge>
              </div>

              {entry.fields_synced && entry.fields_synced.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-600 mb-1">
                    Campos sincronizados ({entry.fields_synced.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {entry.fields_synced.map((field, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {entry.changes_detected && Object.keys(entry.changes_detected).length > 0 && (
                <div className="mt-2 p-2 bg-white rounded border">
                  <p className="text-xs text-slate-600 font-semibold mb-1">
                    Cambios detectados:
                  </p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(entry.changes_detected).map(([field, change]) => (
                      <div key={field} className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{field}:</span>
                        <span className="text-red-600">{String(change.before || '(vacío)')}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-green-600">{String(change.after || '(vacío)')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entry.error_message && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-800">
                    <strong>Error:</strong> {entry.error_message}
                  </p>
                </div>
              )}

              {entry.synced_by && (
                <div className="mt-2 text-xs text-slate-500">
                  Sincronizado por: {entry.synced_by}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}