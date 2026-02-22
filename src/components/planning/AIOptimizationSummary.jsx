import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Zap, Activity, CheckCircle2, Info } from "lucide-react";

export default function AIOptimizationSummary({ plan, machines, orders }) {
  if (!plan) return null;

  const { resumen_ejecutivo, kpis, alertas, recomendaciones_generales } = plan;

  const kpiCards = [
    {
      label: "Órdenes en Riesgo",
      value: kpis?.ordenes_en_riesgo ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    },
    {
      label: "Órdenes Urgentes",
      value: kpis?.ordenes_urgentes ?? 0,
      icon: Zap,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    {
      label: "Máquinas Sobrecargadas",
      value: kpis?.maquinas_sobrecargadas ?? 0,
      icon: Activity,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
    {
      label: "Eficiencia Estimada",
      value: `${kpis?.eficiencia_estimada_pct ?? 0}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Left: KPIs + Resumen */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map((k, i) => {
            const Icon = k.icon;
            return (
              <Card key={i} className={`border ${k.border} ${k.bg}`}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                  <Icon className={`w-6 h-6 ${k.color}`} />
                  <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-slate-500">{k.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Resumen ejecutivo */}
        <Card>
          <CardHeader className="py-3 border-b bg-slate-50">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" /> Resumen Ejecutivo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{resumen_ejecutivo}</p>
          </CardContent>
        </Card>

        {/* Recomendaciones generales */}
        {recomendaciones_generales?.length > 0 && (
          <Card>
            <CardHeader className="py-3 border-b bg-slate-50">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Recomendaciones Generales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {recomendaciones_generales.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Alertas */}
      <div className="flex flex-col gap-4">
        <Card className="border-red-200">
          <CardHeader className="py-3 border-b bg-red-50">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" /> Alertas Detectadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {alertas?.length > 0 ? (
              <ul className="space-y-3">
                {alertas.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 pb-3 border-b last:border-0 last:pb-0">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No se detectaron alertas críticas.</p>
            )}
          </CardContent>
        </Card>

        {/* Distribución por recomendación */}
        <Card>
          <CardHeader className="py-3 border-b bg-slate-50">
            <CardTitle className="text-sm font-medium">Distribución del Plan</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {["mantener", "urgente", "en_riesgo", "reubicar"].map(tipo => {
              const count = plan.plan?.filter(i => i.recomendacion === tipo).length || 0;
              const colors = {
                mantener: "bg-green-100 text-green-800 border-green-200",
                urgente: "bg-amber-100 text-amber-800 border-amber-200",
                en_riesgo: "bg-red-100 text-red-800 border-red-200",
                reubicar: "bg-blue-100 text-blue-800 border-blue-200",
              };
              const labels = {
                mantener: "Mantener",
                urgente: "Urgente",
                en_riesgo: "En Riesgo",
                reubicar: "Reubicar",
              };
              return (
                <div key={tipo} className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-xs ${colors[tipo]}`}>{labels[tipo]}</Badge>
                  <span className="text-sm font-semibold text-slate-700">{count} órdenes</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}