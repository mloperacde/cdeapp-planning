import { ReportingAnalytics } from '@/components/commercial/ReportingAnalytics';
import { BarChart3 } from 'lucide-react';

export default function ReportingAnalyticsPage() {
  return (
    <div className="h-full flex flex-col p-3 md:p-6 gap-4 md:gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Reportes y Análisis</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Métricas e indicadores del módulo comercial
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 md:gap-6 max-w-7xl mx-auto w-full">
        <ReportingAnalytics />
      </div>
    </div>
  );
}