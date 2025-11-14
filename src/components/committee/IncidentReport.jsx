import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  TrendingUp,
  FileText,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function IncidentReport({ incidents, employees }) {
  const stats = useMemo(() => {
    const abiertos = incidents.filter(i => 
      i.estado_investigacion === "Pendiente" || i.estado_investigacion === "En Curso"
    );
    
    const cerrados = incidents.filter(i => 
      i.estado_investigacion === "Cerrada" || i.estado_investigacion === "Completada"
    );

    const conBaja = incidents.filter(i => i.dias_baja > 0);
    
    const porTipo = {
      "Accidente": incidents.filter(i => i.tipo === "Accidente").length,
      "Incidente": incidents.filter(i => i.tipo === "Incidente").length,
      "Casi Accidente": incidents.filter(i => i.tipo === "Casi Accidente").length
    };

    const porGravedad = {
      "Leve": incidents.filter(i => i.gravedad === "Leve").length,
      "Grave": incidents.filter(i => i.gravedad === "Grave").length,
      "Muy Grave": incidents.filter(i => i.gravedad === "Muy Grave").length,
      "Mortal": incidents.filter(i => i.gravedad === "Mortal").length
    };

    const medidasPendientes = incidents.reduce((sum, inc) => 
      sum + (inc.medidas_correctoras?.filter(m => m.estado === "Pendiente").length || 0), 0
    );

    const medidasEnProceso = incidents.reduce((sum, inc) => 
      sum + (inc.medidas_correctoras?.filter(m => m.estado === "En Proceso").length || 0), 0
    );

    const medidasCompletadas = incidents.reduce((sum, inc) => 
      sum + (inc.medidas_correctoras?.filter(m => m.estado === "Completada").length || 0), 0
    );

    return {
      abiertos: abiertos.length,
      cerrados: cerrados.length,
      conBaja: conBaja.length,
      totalDiasBaja: conBaja.reduce((sum, i) => sum + (i.dias_baja || 0), 0),
      porTipo,
      porGravedad,
      medidasPendientes,
      medidasEnProceso,
      medidasCompletadas,
      totalMedidas: medidasPendientes + medidasEnProceso + medidasCompletadas
    };
  }, [incidents]);

  const handleExportReport = () => {
    const csv = [
      "Código,Tipo,Gravedad,Empleado,Departamento,Fecha,Días Baja,Estado Investigación,Medidas Pendientes,Medidas Completadas",
      ...incidents.map(inc => {
        const emp = employees.find(e => e.id === inc.employee_id);
        const medidasPend = inc.medidas_correctoras?.filter(m => m.estado === "Pendiente").length || 0;
        const medidasComp = inc.medidas_correctoras?.filter(m => m.estado === "Completada").length || 0;
        
        return [
          inc.codigo_incidente,
          inc.tipo,
          inc.gravedad,
          emp?.nombre || "",
          inc.departamento,
          format(new Date(inc.fecha_hora), "dd/MM/yyyy HH:mm"),
          inc.dias_baja || 0,
          inc.estado_investigacion,
          medidasPend,
          medidasComp
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `informe_incidentes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Informe de Incidentes</h2>
        <Button onClick={handleExportReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium">Abiertos</p>
                <p className="text-2xl font-bold text-red-900">{stats.abiertos}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Cerrados</p>
                <p className="text-2xl font-bold text-green-900">{stats.cerrados}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">Con Baja</p>
                <p className="text-2xl font-bold text-amber-900">{stats.conBaja}</p>
              </div>
              <XCircle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">Días de Baja Total</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalDiasBaja}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por Tipo y Gravedad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base">Distribución por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {Object.entries(stats.porTipo).map(([tipo, count]) => (
              <div key={tipo} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{tipo}</span>
                <Badge className={
                  tipo === "Accidente" ? "bg-red-600" :
                  tipo === "Incidente" ? "bg-amber-600" :
                  "bg-yellow-600"
                }>
                  {count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base">Distribución por Gravedad</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {Object.entries(stats.porGravedad).map(([gravedad, count]) => (
              <div key={gravedad} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{gravedad}</span>
                <Badge className={
                  gravedad === "Mortal" ? "bg-red-600" :
                  gravedad === "Muy Grave" ? "bg-red-100 text-red-800" :
                  gravedad === "Grave" ? "bg-amber-100 text-amber-800" :
                  "bg-green-100 text-green-800"
                }>
                  {count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Estado de Medidas Correctoras */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base">Estado de Medidas Correctoras</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-900">{stats.medidasPendientes}</div>
              <div className="text-xs text-amber-700">Pendientes</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{stats.medidasEnProceso}</div>
              <div className="text-xs text-blue-700">En Proceso</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">{stats.medidasCompletadas}</div>
              <div className="text-xs text-green-700">Completadas</div>
            </div>
          </div>
          
          {stats.totalMedidas > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Progreso General</span>
                <span className="font-semibold">
                  {Math.round((stats.medidasCompletadas / stats.totalMedidas) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600"
                  style={{ width: `${(stats.medidasCompletadas / stats.totalMedidas) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}