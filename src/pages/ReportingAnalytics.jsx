import { ReportingAnalytics } from '@/components/commercial/ReportingAnalytics';

export default function ReportingAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Reportes y Análisis</h1>
          <p className="text-slate-600">Métricas e indicadores del módulo comercial</p>
        </div>

        <ReportingAnalytics />
      </div>
    </div>
  );
}