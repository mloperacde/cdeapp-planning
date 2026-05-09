import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Search, Plus, Eye, Copy, Trash2 } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';

export default function QuotesList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [typeFilter, setTypeFilter] = useState('todos');

  const { data: quotes = [], isLoading, refetch } = useQuery({
    queryKey: ['quotes', search, statusFilter, typeFilter],
    queryFn: async () => {
      let result = await base44.entities.QuoteTemplate.list('-updated_date', 500);
      
      if (search) {
        result = result.filter(q =>
          q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
          q.client_name.toLowerCase().includes(search.toLowerCase()) ||
          q.client_company?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (statusFilter !== 'todos') {
        result = result.filter(q => q.status === statusFilter);
      }
      
      if (typeFilter !== 'todos') {
        result = result.filter(q => q.quote_type === typeFilter);
      }
      
      return result;
    }
  });

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

  const getTypeColor = (type) => {
    return type === 'ENVASADO_SOLO'
      ? 'bg-blue-50 border-blue-200'
      : 'bg-green-50 border-green-200';
  };

  if (isLoading) return <LoadingState message="Cargando presupuestos..." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Presupuestos</h1>
            <p className="text-slate-600">Gestión completa de cotizaciones</p>
          </div>
          <Link to="/QuoteGenerator">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Presupuesto
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Número, cliente, empresa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ENVASADO_SOLO">Solo Envasado</SelectItem>
                    <SelectItem value="SERVICIO_360">Servicio 360</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('todos');
                    setTypeFilter('todos');
                  }}
                  className="w-full"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {quotes.length === 0 ? (
          <EmptyState
            title="No hay presupuestos"
            description="Crea tu primer presupuesto para comenzar"
          />
        ) : (
          <div className="grid gap-4">
            {quotes.map((quote) => (
              <Card key={quote.id} className={cn('hover:shadow-lg transition-shadow', getTypeColor(quote.quote_type))}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Presupuesto</p>
                      <p className="font-mono font-semibold text-blue-600">{quote.quote_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Cliente</p>
                      <p className="font-semibold">{quote.client_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Producto</p>
                      <p className="capitalize">{quote.product_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Total</p>
                      <p className="font-semibold">€{quote.price_breakdown?.total?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded">
                      {quote.quote_type === 'ENVASADO_SOLO' ? 'Envasado Solo' : 'Servicio 360'}
                    </span>
                    <span className={cn('text-xs px-2 py-1 rounded font-medium', getStatusColor(quote.status))}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded">
                      {quote.volume?.toLocaleString()} un.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/QuoteDetail/${quote.id}`}>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Eye className="w-4 h-4" />
                        Ver
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Copy className="w-4 h-4" />
                      Duplicar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}