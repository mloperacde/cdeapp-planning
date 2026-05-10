import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { Search, Plus, Eye, Copy, Trash2, FileText, FileDown } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';
import { downloadQuotePDF } from '@/components/commercial/QuotePDFGenerator';

export default function QuotesList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes', search, statusFilter, typeFilter],
    queryFn: async () => {
      let result = await base44.entities.QuoteTemplate.list('-updated_date', 500);
      if (search) {
        result = result.filter(q =>
          q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
          q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
          q.client_company?.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (statusFilter !== 'todos') result = result.filter(q => q.status === statusFilter);
      if (typeFilter !== 'todos') result = result.filter(q => q.quote_type === typeFilter);
      return result;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QuoteTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setDeleteId(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (quote) => {
      const { id, created_date, updated_date, created_by, ...rest } = quote;
      const quoteNumber = `QUOTE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      return base44.entities.QuoteTemplate.create({
        ...rest,
        quote_number: quoteNumber,
        status: 'borrador',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const getStatusColor = (status) => {
    const colors = {
      'borrador': 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
      'enviado': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      'aprobado': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      'rechazado': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      'cancelado': 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
    };
    return colors[status] || colors['borrador'];
  };

  if (isLoading) return <LoadingState message="Cargando presupuestos..." />;

  const quoteToDelete = quotes.find(q => q.id === deleteId);

  return (
    <div className="h-full flex flex-col p-3 md:p-6 gap-4 md:gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Presupuestos</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Gestión completa de cotizaciones
          </p>
        </div>
        <div className="ml-auto">
          <Link to="/QuoteGenerator">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 text-xs md:text-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4 md:gap-6">
        {/* Filters */}
        <Card className="shrink-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Número, cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
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
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
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
                  onClick={() => { setSearch(''); setStatusFilter('todos'); setTypeFilter('todos'); }}
                  className="w-full text-xs h-9"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {quotes.length === 0 ? (
          <EmptyState title="No hay presupuestos" description="Crea tu primer presupuesto para comenzar" />
        ) : (
          <div className="flex flex-col gap-3">
            {quotes.map((quote) => (
              <Card key={quote.id} className="hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-800">
                <CardContent className="p-4 md:p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Presupuesto</p>
                      <p className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">{quote.quote_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Cliente</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{quote.client_name}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Producto</p>
                      <p className="capitalize text-slate-900 dark:text-slate-100 text-sm">{quote.product_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">€{(quote.price_breakdown?.total || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                      {quote.quote_type === 'ENVASADO_SOLO' ? 'Envasado Solo' : 'Servicio 360'}
                    </span>
                    <span className={cn('text-xs px-2 py-1 rounded font-medium', getStatusColor(quote.status))}>
                      {quote.status?.charAt(0).toUpperCase() + quote.status?.slice(1)}
                    </span>
                    {quote.volume && (
                      <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                        {quote.volume?.toLocaleString()} un.
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Link to={`/QuoteDetail/${quote.id}`}>
                      <Button size="sm" variant="outline" className="gap-2 text-xs h-8">
                        <Eye className="w-3 h-3" />
                        Ver
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-xs h-8"
                      onClick={() => downloadQuotePDF(quote)}
                    >
                      <FileDown className="w-3 h-3" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-xs h-8"
                      disabled={duplicateMutation.isPending}
                      onClick={() => duplicateMutation.mutate(quote)}
                    >
                      <Copy className="w-3 h-3" />
                      Duplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-xs h-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      onClick={() => setDeleteId(quote.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el presupuesto <strong>{quoteToDelete?.quote_number}</strong> de <strong>{quoteToDelete?.client_name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}