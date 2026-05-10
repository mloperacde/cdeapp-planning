import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { FileDown, Send, Edit2, Save, X, ArrowLeft, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadQuotePDF } from '@/components/commercial/QuotePDFGenerator';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => base44.entities.QuoteTemplate.get(id),
    onSuccess: (data) => {
      setEditData(data);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.QuoteTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setIsEditing(false);
    },
  });

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleStartEdit = () => {
    setEditData({ ...quote });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditData({ ...quote });
    setIsEditing(false);
  };

  if (isLoading) return <LoadingState message="Cargando presupuesto..." />;
  if (!quote) return <EmptyState title="Presupuesto no encontrado" />;

  const display = isEditing ? editData : quote;

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/QuotesList')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{quote.quote_number}</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">{quote.client_name}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} className="gap-2">
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                {display.status === 'borrador' && (
                  <Button
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                    onClick={() => updateMutation.mutate({ status: 'enviado', sent_date: new Date().toISOString() })}
                    disabled={updateMutation.isPending}
                  >
                    <Send className="w-4 h-4" />
                    Marcar Enviado
                  </Button>
                )}
                {display.status === 'enviado' && (
                  <Button
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => updateMutation.mutate({ status: 'aprobado', approval_date: new Date().toISOString() })}
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar Aprobado
                  </Button>
                )}
                <Button variant="outline" onClick={handleStartEdit} className="gap-2">
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
                <Button variant="outline" onClick={() => downloadQuotePDF(quote)} className="gap-2">
                  <FileDown className="w-4 h-4" />
                  Descargar PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Estado</p>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={(v) => handleEditChange('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getStatusColor(display.status)}>
                    {display.status?.charAt(0).toUpperCase() + display.status?.slice(1)}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Tipo</p>
                <p className="font-semibold dark:text-slate-100">
                  {display.quote_type === 'ENVASADO_SOLO' ? 'Solo Envasado' : 'Servicio 360'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Creado</p>
                <p className="font-semibold dark:text-slate-100">
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
            {display.quote_type === 'SERVICIO_360' && <TabsTrigger value="materials">Materiales</TabsTrigger>}
            <TabsTrigger value="pricing">Precios</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle>Información del Cliente</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isEditing ? (
                  <>
                    <div><Label>Nombre</Label><Input value={editData.client_name || ''} onChange={(e) => handleEditChange('client_name', e.target.value)} /></div>
                    <div><Label>Empresa</Label><Input value={editData.client_company || ''} onChange={(e) => handleEditChange('client_company', e.target.value)} /></div>
                    <div><Label>Email</Label><Input type="email" value={editData.client_email || ''} onChange={(e) => handleEditChange('client_email', e.target.value)} /></div>
                    <div><Label>Teléfono</Label><Input value={editData.client_phone || ''} onChange={(e) => handleEditChange('client_phone', e.target.value)} /></div>
                    <div className="md:col-span-2"><Label>Notas</Label><Textarea value={editData.notes || ''} onChange={(e) => handleEditChange('notes', e.target.value)} className="h-20" /></div>
                  </>
                ) : (
                  <>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Nombre</p><p className="font-semibold dark:text-slate-100">{display.client_name}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Empresa</p><p className="font-semibold dark:text-slate-100">{display.client_company || '-'}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Email</p><p className="font-semibold dark:text-slate-100">{display.client_email}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Teléfono</p><p className="font-semibold dark:text-slate-100">{display.client_phone || '-'}</p></div>
                    {display.notes && <div className="md:col-span-2"><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Notas</p><p className="dark:text-slate-300">{display.notes}</p></div>}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Packaging Tab */}
          <TabsContent value="packaging">
            <Card>
              <CardHeader><CardTitle>Especificaciones de Envasado</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isEditing ? (
                  <>
                    <div>
                      <Label>Tipo de Producto</Label>
                      <Select value={editData.product_type || ''} onValueChange={(v) => handleEditChange('product_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cosmetico">Cosmético</SelectItem>
                          <SelectItem value="perfumeria">Perfumería</SelectItem>
                          <SelectItem value="sanitario">Sanitario</SelectItem>
                          <SelectItem value="alimenticio">Alimenticio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Volumen (unidades)</Label><Input type="number" value={editData.volume || ''} onChange={(e) => handleEditChange('volume', Number(e.target.value))} /></div>
                    <div>
                      <Label>Tipo de Envase</Label>
                      <Select value={editData.container_type || ''} onValueChange={(v) => handleEditChange('container_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frasco">Frasco</SelectItem>
                          <SelectItem value="bote">Bote</SelectItem>
                          <SelectItem value="blister">Blister</SelectItem>
                          <SelectItem value="carton">Cartón</SelectItem>
                          <SelectItem value="bolsa">Bolsa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sistema de Llenado</Label>
                      <Select value={editData.filling_system || ''} onValueChange={(v) => handleEditChange('filling_system', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bomba_peristaltica">Bomba Peristáltica</SelectItem>
                          <SelectItem value="piston">Pistón</SelectItem>
                          <SelectItem value="masa">Masa</SelectItem>
                          <SelectItem value="volumetrica">Volumétrica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Etiquetado</Label>
                      <Select value={editData.labeling_system || ''} onValueChange={(v) => handleEditChange('labeling_system', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="semiautomatico">Semiautomático</SelectItem>
                          <SelectItem value="automatico">Automático</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Taponado</Label>
                      <Select value={editData.capping_system || ''} onValueChange={(v) => handleEditChange('capping_system', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="semiautomatico">Semiautomático</SelectItem>
                          <SelectItem value="automatico">Automático</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Plazo de entrega (días)</Label><Input type="number" value={editData.delivery_days || ''} onChange={(e) => handleEditChange('delivery_days', Number(e.target.value))} /></div>
                  </>
                ) : (
                  <>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Producto</p><p className="font-semibold capitalize dark:text-slate-100">{display.product_type}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Volumen</p><p className="font-semibold dark:text-slate-100">{display.volume?.toLocaleString()} unidades</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tipo de envase</p><p className="font-semibold capitalize dark:text-slate-100">{display.container_type}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sistema de llenado</p><p className="font-semibold dark:text-slate-100">{display.filling_system?.replace(/_/g, ' ')}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Etiquetado</p><p className="font-semibold dark:text-slate-100">{display.labeling_system?.replace(/_/g, ' ')}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Taponado</p><p className="font-semibold dark:text-slate-100">{display.capping_system?.replace(/_/g, ' ')}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Línea</p><p className="font-semibold dark:text-slate-100">{display.line_type?.replace(/_/g, ' ')}</p></div>
                    <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Plazo de entrega</p><p className="font-semibold dark:text-slate-100">{display.delivery_days} días</p></div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          {display.quote_type === 'SERVICIO_360' && (
            <TabsContent value="materials">
              <Card>
                <CardHeader><CardTitle>Suministro de Materiales</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {display.materials_supply?.blisters && <p className="dark:text-slate-200">✓ Blísteres/Envases primarios</p>}
                  {display.materials_supply?.printed_cards && <p className="dark:text-slate-200">✓ Tarjetas impresas</p>}
                  {display.materials_supply?.caps && <p className="dark:text-slate-200">✓ Tapones/Cierres</p>}
                  {display.materials_supply?.pumps && <p className="dark:text-slate-200">✓ Bombas dosificadoras</p>}
                  {display.materials_supply?.labels && <p className="dark:text-slate-200">✓ Etiquetas impresas</p>}
                  {display.distribution_included && <p className="dark:text-slate-200">✓ Distribución a puntos de venta</p>}
                  {!display.materials_supply && <p className="text-slate-500">Sin materiales configurados</p>}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader><CardTitle>Desglose de Precios</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Mano de obra', val: display.price_breakdown?.labor_cost },
                    { label: 'Máquinas', val: display.price_breakdown?.machine_cost },
                    display.price_breakdown?.material_cost > 0 && { label: 'Materiales', val: display.price_breakdown?.material_cost },
                    display.price_breakdown?.distribution_cost > 0 && { label: 'Distribución', val: display.price_breakdown?.distribution_cost },
                    { label: 'Subtotal', val: display.price_breakdown?.subtotal },
                    { label: `IVA (${display.price_breakdown?.tax_percentage || 21}%)`, val: ((display.price_breakdown?.subtotal || 0) * (display.price_breakdown?.tax_percentage || 21) / 100) },
                  ].filter(Boolean).map(({ label, val }) => (
                    <div key={label} className="flex justify-between pb-2 border-b dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">{label}</span>
                      <span className="font-semibold dark:text-slate-100">€{(val || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 text-lg">
                    <span className="font-bold dark:text-slate-100">Total</span>
                    <span className="font-bold text-green-600">€{(display.price_breakdown?.total || 0).toFixed(2)}</span>
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