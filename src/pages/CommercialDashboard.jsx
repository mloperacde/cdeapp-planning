import { useState, useEffect } from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Módulo Comercial</h1>
            <p className="text-slate-600">Gestión de presupuestos y cotizaciones</p>
          </div>
          <Link to="/QuoteGenerator">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Presupuesto
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="Total Presupuestos"
            value={stats.total}
            icon={<FileText className="w-6 h-6" />}
            color="bg-blue-500"
          />
          <StatCard
            title="En Borrador"
            value={stats.draft}
            icon={<Clock className="w-6 h-6" />}
            color="bg-slate-500"
          />
          <StatCard
            title="Pendientes"
            value={stats.pending}
            icon={<Clock className="w-6 h-6" />}
            color="bg-amber-500"
          />
          <StatCard
            title="Aprobados"
            value={stats.approved}
            icon={<CheckCircle className="w-6 h-6" />}
            color="bg-green-500"
          />
          <StatCard
            title="Ingresos"
            value={`€${(stats.totalRevenue / 1000).toFixed(1)}k`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="bg-emerald-500"
          />
        </div>

        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Presupuestos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentQuotes.length === 0 ? (
              <EmptyState
                title="No hay presupuestos"
                description="Crea tu primer presupuesto para comenzar"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
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
                      <tr key={quote.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-blue-600">
                          <Link to={`/QuoteDetail/${quote.id}`} className="hover:underline">
                            {quote.quote_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{quote.client_name}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 bg-slate-100 rounded">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Link to="/QuotesList">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <FileText className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold mb-1">Ver Todos los Presupuestos</h3>
                <p className="text-sm text-slate-600">Búsqueda y gestión completa</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/PricingConfiguration">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <TrendingUp className="w-8 h-8 text-emerald-600 mb-2" />
                <h3 className="font-semibold mb-1">Configuración de Precios</h3>
                <p className="text-sm text-slate-600">Ajusta tarifas y márgenes</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/ReportingAnalytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-semibold mb-1">Reportes</h3>
                <p className="text-sm text-slate-600">Análisis y estadísticas</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={cn('p-3 rounded-lg text-white', color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}