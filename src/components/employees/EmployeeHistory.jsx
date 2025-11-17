import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Briefcase, Building2, DollarSign, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function EmployeeHistory({ employeeId }) {
  const { data: history = [] } = useQuery({
    queryKey: ['employeeHistory', employeeId],
    queryFn: () => base44.entities.EmployeeHistory.filter({ employee_id: employeeId }, '-fecha_cambio'),
    initialData: [],
  });

  const getIcon = (tipo) => {
    switch (tipo) {
      case "puesto": return <Briefcase className="w-4 h-4" />;
      case "departamento": return <Building2 className="w-4 h-4" />;
      case "salario": return <DollarSign className="w-4 h-4" />;
      case "categoria": return <Users className="w-4 h-4" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const getColor = (tipo) => {
    switch (tipo) {
      case "puesto": return "blue";
      case "departamento": return "green";
      case "salario": return "purple";
      case "categoria": return "orange";
      default: return "slate";
    }
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Historial Laboral
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {history.length === 0 ? (
          <p className="text-center text-slate-500 py-4">No hay cambios registrados</p>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="flex gap-4 items-start pb-4 border-b last:border-0">
                <div className={`mt-1 p-2 rounded-lg bg-${getColor(item.tipo_cambio)}-100 text-${getColor(item.tipo_cambio)}-700`}>
                  {getIcon(item.tipo_cambio)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.campo_modificado}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.valor_anterior || "N/A"}
                        </Badge>
                        <span className="text-slate-400">→</span>
                        <Badge className={`bg-${getColor(item.tipo_cambio)}-600 text-white text-xs`}>
                          {item.valor_nuevo}
                        </Badge>
                      </div>
                      {item.motivo && (
                        <p className="text-xs text-slate-600 mt-2">
                          <strong>Motivo:</strong> {item.motivo}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{format(new Date(item.fecha_cambio), "d MMM yyyy", { locale: es })}</p>
                      {item.realizado_por && (
                        <p className="mt-1">Por: {item.realizado_por}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}