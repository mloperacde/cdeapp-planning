import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, EmptyState } from '@/components/ui/loading-state';
import { FileDown, Send, CheckCircle, X, Edit2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => base44.entities.QuoteTemplate.get(id),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => base44.entities.QuoteTemplate.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setIsEditing(false);
    },
  });

  if (isLoading) return <LoadingState message="Cargando presupuesto..." />;
  if (!quote) return <EmptyState title="Presupuesto no encontrado" />;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{quote.quote_number}</h1>
            <p className="text-slate-600 mt-1">{quote.client_name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {quote.status === 'borrador' && (
              <>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4" />
                  Enviar
                </Button>
                <Button variant="outline">Editar</Button>
              </>
            )}
            <Button variant="outline" className="gap-2">
              <FileDown className="w-4 h-4" />
              Descargar PDF
            </Button>
          </div>
        </div>

        {/* Status & Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-2">Estado</p>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borrador">Borrador</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate(newStatus)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNewStatus(quote.status);
                        setIsEditing(true);
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Tipo</p>
                <p className="font-semibold">
                  {quote.quote_type === 'ENVASADO_SOLO' ? 'Solo Envasado' : 'Servicio 360'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Válido hasta</p>
                <p className="font-semibold">
                  {new Date(quote.created_date).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="packaging">Envasado</TabsTrigger>
            <TabsTrigger value="materials">Materiales</TabsTrigger>
            <TabsTrigger value="pricing">Precios</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Nombre</p>
                  <p className="font-semibold">{quote.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Empresa</p>
                  <p className="font-semibold">{quote.client_company}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Email</p>
                  <p className="font-semibold">{quote.client_email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Teléfono</p>
                  <p className="font-semibold">{quote.client_phone}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Packaging Tab */}
          <TabsContent value="packaging">
            <Card>
              <CardHeader>
                <CardTitle>Especificaciones de Envasado</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Producto</p>
                  <p className="font-semibold capitalize">{quote.product_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Volumen</p>
                  <p className="font-semibold">{quote.volume?.toLocaleString()} unidades</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Tipo de envase</p>
                  <p className="font-semibold capitalize">{quote.container_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Sistema de llenado</p>
                  <p className="font-semibold">{quote.filling_system?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Etiquetado</p>
                  <p className="font-semibold">{quote.labeling_system?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Taponado</p>
                  <p className="font-semibold">{quote.capping_system?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Línea</p>
                  <p className="font-semibold">{quote.line_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Plazo de entrega</p>
                  <p className="font-semibold">{quote.delivery_days} días</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          {quote.quote_type === 'SERVICIO_360' && (
            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <CardTitle>Suministro de Materiales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quote.materials_supply?.blisters && <p>✓ Blísteres/Envases primarios</p>}
                  {quote.materials_supply?.printed_cards && <p>✓ Tarjetas impresas</p>}
                  {quote.materials_supply?.caps && <p>✓ Tapones/Cierres</p>}
                  {quote.materials_supply?.pumps && <p>✓ Bombas dosificadoras</p>}
                  {quote.materials_supply?.labels && <p>✓ Etiquetas impresas</p>}
                  {quote.distribution_included && <p>✓ Distribución a puntos de venta</p>}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Desglose de Precios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-slate-600">Costo de mano de obra</span>
                    <span className="font-semibold">€{quote.price_breakdown?.labor_cost?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-slate-600">Costo de máquinas</span>
                    <span className="font-semibold">€{quote.price_breakdown?.machine_cost?.toFixed(2)}</span>
                  </div>
                  {quote.price_breakdown?.material_cost > 0 && (
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-slate-600">Materiales</span>
                      <span className="font-semibold">€{quote.price_breakdown?.material_cost?.toFixed(2)}</span>
                    </div>
                  )}
                  {quote.price_breakdown?.distribution_cost > 0 && (
                    <div className="flex justify-between pb-2 border-b">
                      <span className="text-slate-600">Distribución</span>
                      <span className="font-semibold">€{quote.price_breakdown?.distribution_cost?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold">€{quote.price_breakdown?.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-slate-600">IVA ({quote.price_breakdown?.tax_percentage}%)</span>
                    <span className="font-semibold">€{((quote.price_breakdown?.subtotal || 0) * (quote.price_breakdown?.tax_percentage || 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-green-600">€{quote.price_breakdown?.total?.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}