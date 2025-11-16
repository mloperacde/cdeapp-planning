import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MobileVacationsPage() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employee } = useQuery({
    queryKey: ['currentEmployee', currentUser?.email],
    queryFn: () => currentUser?.email 
      ? base44.entities.Employee.filter({ email: currentUser.email }).then(r => r[0])
      : null,
    enabled: !!currentUser?.email,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['absenceDaysBalance', employee?.id],
    queryFn: () => employee?.id 
      ? base44.entities.AbsenceDaysBalance.filter({ 
          employee_id: employee.id,
          anio: new Date().getFullYear()
        })
      : [],
    initialData: [],
    enabled: !!employee?.id,
  });

  const { data: pendingBalance } = useQuery({
    queryKey: ['vacationPendingBalance', employee?.id],
    queryFn: () => employee?.id 
      ? base44.entities.VacationPendingBalance.filter({ 
          employee_id: employee.id,
          anio: new Date().getFullYear()
        }).then(r => r[0])
      : null,
    enabled: !!employee?.id,
  });

  const vacacionesBalance = balances.find(b => b.tipo_permiso === "Vacaciones");

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-slate-600">Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 pb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Mis Vacaciones
        </h1>
        <p className="text-emerald-100 text-sm mt-1">Consulta tu saldo y días disponibles</p>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {vacacionesBalance && (
          <Card className="shadow-lg border-2 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">Vacaciones {new Date().getFullYear()}</h2>
                <Badge className="bg-emerald-600 text-white">
                  {vacacionesBalance.dias_totales_derecho} días
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-600">Disponibles</p>
                  <p className="text-2xl font-bold text-green-900">
                    {vacacionesBalance.dias_pendientes || 0}
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-600">Disfrutados</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {vacacionesBalance.dias_disfrutados || 0}
                  </p>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-slate-600">Total</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {vacacionesBalance.dias_totales_derecho}
                  </p>
                </div>
              </div>

              {vacacionesBalance.periodos_disfrutados?.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Períodos Disfrutados:</p>
                  <div className="space-y-2">
                    {vacacionesBalance.periodos_disfrutados.map((periodo, idx) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded text-xs">
                        <div className="flex justify-between items-center">
                          <span>
                            {format(new Date(periodo.fecha_inicio), "dd/MM/yy", { locale: es })} - {format(new Date(periodo.fecha_fin), "dd/MM/yy", { locale: es })}
                          </span>
                          <Badge variant="outline">{periodo.dias_consumidos} días</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {pendingBalance && pendingBalance.dias_disponibles > 0 && (
          <Card className="shadow-lg border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-900 mb-1">Días Pendientes</h3>
                  <p className="text-sm text-amber-800 mb-2">
                    Tienes <strong>{pendingBalance.dias_disponibles}</strong> día(s) de vacaciones pendientes por estar ausente durante períodos vacacionales.
                  </p>
                  {pendingBalance.detalle_ausencias?.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-amber-700 font-medium">Ver detalle</summary>
                      <div className="mt-2 space-y-1">
                        {pendingBalance.detalle_ausencias.map((det, idx) => (
                          <div key={idx} className="bg-white p-2 rounded">
                            <p className="font-medium">{det.tipo_ausencia}</p>
                            <p className="text-slate-600">
                              {format(new Date(det.fecha_inicio), "dd/MM/yy", { locale: es })} - {format(new Date(det.fecha_fin), "dd/MM/yy", { locale: es })}
                            </p>
                            <p className="text-amber-700">{det.dias_coincidentes} día(s) pendiente(s)</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {balances.filter(b => b.tipo_permiso !== "Vacaciones").map(balance => (
          <Card key={balance.id} className="shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900">{balance.tipo_permiso}</h3>
                <Badge variant="outline">{balance.dias_totales_derecho} días</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded text-center">
                  <p className="text-xs text-slate-600">Disponibles</p>
                  <p className="text-lg font-bold text-slate-900">{balance.dias_pendientes || 0}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded text-center">
                  <p className="text-xs text-slate-600">Disfrutados</p>
                  <p className="text-lg font-bold text-slate-900">{balance.dias_disfrutados || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {balances.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay saldos registrados para este año</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}