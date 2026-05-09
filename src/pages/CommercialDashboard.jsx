import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';

export default function CommercialDashboard() {
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.QuoteTemplate.list('-updated_date', 100),
  });

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'borrador').length,
    pending: quotes.filter(q => q.status === 'enviado').length,
    approved: quotes.filter(q => q.status === 'aprobado').length,
    rejected: quotes.filter(q => q.status === 'rechazado').length,
    totalRevenue: quotes
      .filter(q => q.status === 'aprobado' && q.price_breakdown?.total)
      .reduce((sum, q) => sum + q.price_breakdown.total, 0)
  };

  const recentQuotes = quotes.slice(0, 5);

  const getStatusColor = (status) => {
    const colors = {
      'borrador': 'bg-slate-100 text-slate-800',
      'enviado': 'bg-blue-100 text-blue-800',
      'aprobado': 'bg-green-100 text-green-800',
      'rechazado': 'bg-red-100 text-red-800',
      'cancelado': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors['borrador'];
  };

  if (isLoading) return <LoadingState message="Cargando dashboard comercial..." />;

  return (
    <div className="h-full flex flex-col p-3 md:p-6 gap-4 md:gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Módulo Comercial</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Gestión de presupuestos y cotizaciones
          </p>
        </div>
        <div className="ml-auto">
          <Link to="/QuoteGenerator">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 text-xs md:text-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Presupuesto</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4 md:gap-6">
        {/* Stats Grid */}
        <section aria-label="Estadísticas comerciales" className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <StatCard
            title="Total"
            value={stats.total}
            icon={FileText}
            colorFrom="from-blue-50"
            colorTo="to-blue-100"
            borderColor="border-blue-200"
            textColor="text-blue-700"
            valueColor="text-blue-900"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Borrador"
            value={stats.draft}
            icon={Clock}
            colorFrom="from-slate-50"
            colorTo="to-slate-100"
            borderColor="border-slate-200"
            textColor="text-slate-700"
            valueColor="text-slate-900"
            iconColor="text-slate-600"
          />
          <StatCard
            title="Pendientes"
            value={stats.pending}
            icon={Clock}
            colorFrom="from-amber-50"
            colorTo="to-amber-100"
            borderColor="border-amber-200"
            textColor="text-amber-700"
            valueColor="text-amber-900"
            iconColor="text-amber-600"
          />
          <StatCard
            title="Aprobados"
            value={stats.approved}
            icon={CheckCircle}
            colorFrom="from-green-50"
            colorTo="to-green-100"
            borderColor="border-green-200"
            textColor="text-green-700"
            valueColor="text-green-900"
            iconColor="text-green-600"
          />
          <StatCard
            title="Ingresos"
            value={`€${(stats.totalRevenue / 1000).toFixed(1)}k`}
            icon={TrendingUp}
            colorFrom="from-emerald-50"
            colorTo="to-emerald-100"
            borderColor="border-emerald-200"
            textColor="text-emerald-700"
            valueColor="text-emerald-900"
            iconColor="text-emerald-600"
          />
        </section>

        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Presupuestos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentQuotes.length === 0 ? (
              <EmptyState
                title="No hay presupuestos"
                description="Crea tu primer presupuesto para comenzar"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Número</th>
                      <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                      <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold">Volumen</th>
                      <th className="px-4 py-3 text-left font-semibold">Total</th>
                      <th className="px-4 py-3 text-left font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentQuotes.map((quote) => (
                      <tr key={quote.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                          <Link to={`/QuoteDetail/${quote.id}`} className="hover:underline">
                            {quote.quote_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{quote.client_name}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                            {quote.quote_type === 'ENVASADO_SOLO' ? 'Envasado' : 'Servicio 360'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{quote.volume.toLocaleString()} un.</td>
                        <td className="px-4 py-3 font-semibold">€{quote.price_breakdown?.total?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-1 rounded font-medium', getStatusColor(quote.status))}>
                            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <section aria-label="Accesos rápidos comerciales" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/QuotesList">
            <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-800 cursor-pointer group active:scale-95">
              <CardContent className="p-4 md:p-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Ver Todos</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Búsqueda y gestión completa</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/PricingConfiguration">
            <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-800 cursor-pointer group active:scale-95">
              <CardContent className="p-4 md:p-6">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Precios</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Tarifas y márgenes</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/ReportingAnalytics">
            <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-800 cursor-pointer group active:scale-95">
              <CardContent className="p-4 md:p-6">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Reportes</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Análisis y estadísticas</p>
              </CardContent>
            </Card>
          </Link>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, colorFrom, colorTo, borderColor, textColor, valueColor, iconColor }) {
  return (
    <Card className={`bg-gradient-to-br ${colorFrom} ${colorTo} ${borderColor}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-xs md:text-sm ${textColor} font-medium leading-tight`}>{title}</p>
            <p className={`text-2xl md:text-3xl font-bold ${valueColor} mt-1`}>{value}</p>
          </div>
          <Icon className={`w-8 h-8 md:w-12 md:h-12 ${iconColor} flex-shrink-0`} />
        </div>
      </CardContent>
    </Card>
  );
}