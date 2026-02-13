import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { History, Search, User, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function SalaryAuditHistory({ employeeId = null }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['salaryAuditLogs', employeeId],
    queryFn: () => {
      if (employeeId) {
        return base44.entities.SalaryAuditLog.filter({ employee_id: employeeId }, '-change_date');
      }
      return base44.entities.SalaryAuditLog.list('-change_date', 100);
    },
  });

  const filteredLogs = auditLogs.filter(log =>
    log.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.changed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action) => {
    const colors = {
      "create": "bg-green-100 text-green-700",
      "update": "bg-blue-100 text-blue-700",
      "delete": "bg-red-100 text-red-700",
      "approve": "bg-emerald-100 text-emerald-700",
      "reject": "bg-orange-100 text-orange-700"
    };
    return colors[action] || "bg-slate-100 text-slate-700";
  };

  const getActionLabel = (action) => {
    const labels = {
      "create": "Creación",
      "update": "Modificación",
      "delete": "Eliminación",
      "approve": "Aprobación",
      "reject": "Rechazo"
    };
    return labels[action] || action;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          Historial de Auditoría
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!employeeId && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar en historial..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="border-l-4" style={{ 
                borderLeftColor: log.action === 'create' ? '#10b981' : 
                                 log.action === 'update' ? '#3b82f6' : 
                                 log.action === 'delete' ? '#ef4444' : '#64748b' 
              }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(log.action)}>
                        {getActionLabel(log.action)}
                      </Badge>
                      <Badge variant="outline">{log.entity_type}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {log.change_date ? format(new Date(log.change_date), 'dd/MM/yyyy HH:mm') : '-'}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {log.employee_name && (
                      <div>
                        <span className="text-slate-500">Empleado: </span>
                        <span className="font-medium">{log.employee_name}</span>
                      </div>
                    )}

                    {log.field_changed && (
                      <div>
                        <span className="text-slate-500">Campo modificado: </span>
                        <span className="font-medium">{log.field_changed}</span>
                      </div>
                    )}

                    {(log.old_value || log.new_value) && (
                      <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs">
                        {log.old_value && (
                          <div>
                            <span className="text-slate-500">Anterior: </span>
                            <span className="font-mono">{log.old_value}</span>
                          </div>
                        )}
                        {log.new_value && (
                          <div>
                            <span className="text-slate-500">Nuevo: </span>
                            <span className="font-mono text-emerald-600">{log.new_value}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {log.change_amount !== undefined && log.change_amount !== null && (
                      <div>
                        <span className="text-slate-500">Diferencia: </span>
                        <span className={`font-semibold ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.change_amount > 0 ? '+' : ''}{log.change_amount}€
                        </span>
                      </div>
                    )}

                    {log.change_reason && (
                      <div className="pt-2 border-t">
                        <span className="text-slate-500">Motivo: </span>
                        <p className="text-slate-700">{log.change_reason}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t flex items-center gap-1 text-slate-500">
                      <User className="w-3 h-3" />
                      <span>Por: {log.changed_by_name || 'Sistema'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No hay registros de auditoría</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}