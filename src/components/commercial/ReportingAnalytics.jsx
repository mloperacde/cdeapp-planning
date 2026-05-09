import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LoadingState } from '@/components/ui/loading-state';

export function ReportingAnalytics() {
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes-analytics'],
    queryFn: () => base44.entities.QuoteTemplate.list('-updated_date', 500),
  });

  if (isLoading) return <LoadingState message="Cargando reportes..." />;

  // Calcular estadísticas
  const stats = {
    totalQuotes: quotes.length,
    approvedValue: quotes
      .filter(q => q.status === 'aprobado' && q.price_breakdown?.total)
      .reduce((sum, q) => sum + q.price_breakdown.total, 0),
    conversionRate: quotes.length > 0
      ? ((quotes.filter(q => q.status === 'aprobado').length / quotes.length) * 100).toFixed(1)
      : 0,
    avgQuoteValue: quotes.length > 0
      ? (quotes
          .filter(q => q.price_breakdown?.total)
          .reduce((sum, q) => sum + q.price_breakdown.total, 0) / quotes.length).toFixed(2)
      : 0,
  };

  // Datos por producto
  const productData = Object.entries(
    quotes.reduce((acc, q) => {
      acc[q.product_type] = (acc[q.product_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([product, count]) => ({
    name: product.charAt(0).toUpperCase() + product.slice(1),
    value: count,
  }));

  // Datos por estado
  const statusData = Object.entries(
    quotes.reduce((acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  // Datos por tipo de presupuesto
  const typeData = Object.entries(
    quotes.reduce((acc, q) => {
      const type = q.quote_type === 'ENVASADO_SOLO' ? 'Envasado Solo' : 'Servicio 360';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({
    name: type,
    value: count,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-2">Total Presupuestos</p>
            <p className="text-3xl font-bold text-slate-900">{stats.totalQuotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-2">Tasa Conversión</p>
            <p className="text-3xl font-bold text-green-600">{stats.conversionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-2">Valor Aprobado</p>
            <p className="text-3xl font-bold text-emerald-600">€{(stats.approvedValue / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-2">Valor Promedio</p>
            <p className="text-3xl font-bold text-blue-600">€{stats.avgQuoteValue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Productos */}
        <Card>
          <CardHeader>
            <CardTitle>Presupuestos por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estados */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tipos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Comparativa de Tipos de Presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card>
        <CardHeader>
          <CardTitle>Principales Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quotes
              .reduce((acc, q) => {
                const existing = acc.find(x => x.client === q.client_name);
                if (existing) {
                  existing.count += 1;
                  existing.value += q.price_breakdown?.total || 0;
                } else {
                  acc.push({
                    client: q.client_name,
                    count: 1,
                    value: q.price_breakdown?.total || 0
                  });
                }
                return acc;
              }, [])
              .sort((a, b) => b.value - a.value)
              .slice(0, 10)
              .map((client) => (
                <div key={client.client} className="flex justify-between items-center pb-3 border-b">
                  <div>
                    <p className="font-semibold">{client.client}</p>
                    <p className="text-xs text-slate-600">{client.count} presupuestos</p>
                  </div>
                  <p className="font-bold text-green-600">€{client.value.toFixed(2)}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}