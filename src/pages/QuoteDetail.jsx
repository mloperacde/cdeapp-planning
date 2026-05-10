import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState, EmptyState } from '@/components/ui/loading-state';
import { FileDown, Send, Edit2, ArrowLeft, CheckCircle, Copy } from 'lucide-react';
import { Link, useNavigate as useNav } from 'react-router-dom';
import { downloadQuotePDF } from '@/components/commercial/QuotePDFGenerator';
import { cn } from '@/lib/utils';

const fmt = (n) => (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  borrador: 'bg-slate-100 text-slate-700',
  enviado: 'bg-blue-100 text-blue-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-600',
};

const PRODUCT_LABELS = {
  cosmetico: '🧴 Cosmético', perfumeria: '🌸 Perfumería',
  sanitario: '⚕️ Sanitario', alimenticio: '🥗 Alimenticio', otro: '📦 Otro',
};

const TEXTURE_LABELS = {
  liquido: 'Líquido', crema: 'Crema', gel: 'Gel', emulsion: 'Emulsión',
  spray: 'Spray', polvo: 'Polvo', solido: 'Sólido', otro: 'Otro',
};

const CONTAINER_LABELS = {
  frasco: 'Frasco', bote: 'Bote', tarro: 'Tarro de vidrio', tubo: 'Tubo laminar',
  sachet: 'Sachet', sachet_toallita: 'Sachet c/Toallita', ampolla: 'Ampolla',
  blister: 'Blíster', sobre: 'Sobre', carton: 'Cartón plegable', otro: 'Otro',
};

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{value || '—'}</p>
    </div>
  );
}

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => base44.entities.QuoteTemplate.get(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.QuoteTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  if (isLoading) return <LoadingState message="Cargando presupuesto..." />;
  if (!quote) return <EmptyState title="Presupuesto no encontrado" />;

  const pb = quote.price_breakdown || {};
  const lines = quote.service_lines || [];
  const cc = quote.commercial_conditions || {};
  const ms = quote.materials_supply || {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/QuotesList')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{quote.quote_number}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn(STATUS_COLORS[quote.status])}>
                  {quote.status?.charAt(0).toUpperCase() + quote.status?.slice(1)}
                </Badge>
                <span className="text-xs text-slate-500">{quote.quote_type === 'ENVASADO_SOLO' ? 'Maquila Pura' : 'Servicio 360'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {quote.status === 'borrador' && (
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => updateMutation.mutate({ status: 'enviado', sent_date: new Date().toISOString() })}
                disabled={updateMutation.isPending}>
                <Send className="w-4 h-4" />Marcar Enviado
              </Button>
            )}
            {quote.status === 'enviado' && (
              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => updateMutation.mutate({ status: 'aprobado', approval_date: new Date().toISOString() })}
                disabled={updateMutation.isPending}>
                <CheckCircle className="w-4 h-4" />Marcar Aprobado
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate(`/QuoteGenerator`)} className="gap-2">
              <Edit2 className="w-4 h-4" />Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadQuotePDF(quote)} className="gap-2">
              <FileDown className="w-4 h-4" />PDF
            </Button>
          </div>
        </div>

        {/* Price banner */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
              <div>
                <p className="text-blue-200 text-xs mb-1">Total Presupuesto (c/IVA)</p>
                <p className="text-2xl font-bold">€{fmt(pb.total)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs mb-1">Precio Unitario (s/IVA)</p>
                <p className="text-xl font-bold">€{(pb.unit_price || 0).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs mb-1">Subtotal (s/IVA)</p>
                <p className="text-xl font-bold">€{fmt(pb.subtotal)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs mb-1">Cantidad (MOQ)</p>
                <p className="text-xl font-bold">{(quote.volume || 0).toLocaleString('es-ES')} ud.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="servicios">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="servicios">Líneas de Servicio</TabsTrigger>
            <TabsTrigger value="producto">Producto & Envase</TabsTrigger>
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            {quote.quote_type === 'SERVICIO_360' && <TabsTrigger value="materiales">Materiales</TabsTrigger>}
            <TabsTrigger value="condiciones">Condiciones</TabsTrigger>
          </TabsList>

          {/* LÍNEAS DE SERVICIO */}
          <TabsContent value="servicios">
            <Card>
              <CardHeader><CardTitle>Desglose de Servicios de Producción</CardTitle></CardHeader>
              <CardContent>
                {lines.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b dark:border-slate-700 text-xs text-slate-500">
                          <th className="text-left pb-3 font-semibold">Código</th>
                          <th className="text-left pb-3 font-semibold">Concepto</th>
                          <th className="text-right pb-3 font-semibold">Coste u.</th>
                          <th className="text-right pb-3 font-semibold">Cantidad</th>
                          <th className="text-right pb-3 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {lines.map((line) => (
                          <tr key={line.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">{line.code}</td>
                            <td className="py-3">
                              <p className="font-semibold">{line.concept}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{line.description}</p>
                            </td>
                            <td className="py-3 text-right text-slate-600 dark:text-slate-400 text-xs">
                              {line.is_fixed ? <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs">Fijo</span> : `€${(line.unit_cost || 0).toFixed(4)}`}
                            </td>
                            <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                              {line.is_fixed ? '1' : (line.quantity || 0).toLocaleString('es-ES')}
                            </td>
                            <td className="py-3 text-right font-bold">€{fmt(line.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totales */}
                    <div className="mt-6 border-t dark:border-slate-700 pt-4 space-y-2">
                      {[
                        { label: 'Subtotal servicios', val: pb.services_subtotal },
                        pb.materials_cost > 0 && { label: 'Materiales gestionados', val: pb.materials_cost },
                        pb.quality_cost > 0 && { label: 'Calidad y regulatorio', val: pb.quality_cost },
                        pb.distribution_cost > 0 && { label: 'Distribución', val: pb.distribution_cost },
                      ].filter(Boolean).map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-slate-500">{label}</span>
                          <span>€{fmt(val)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm border-t dark:border-slate-700 pt-2">
                        <span className="font-semibold">Subtotal sin IVA</span>
                        <span className="font-semibold">€{fmt(pb.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>IVA ({pb.tax_percentage || 21}%)</span>
                        <span>€{fmt(pb.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-slate-700">
                        <span>TOTAL</span>
                        <span className="text-green-600">€{fmt(pb.total)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                        <span>Precio unitario sin IVA</span>
                        <span className="font-mono">€{(pb.unit_price || 0).toFixed(4)} / ud.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Sin líneas de servicio. Presupuesto generado con el sistema anterior.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PRODUCTO */}
          <TabsContent value="producto">
            <Card>
              <CardHeader><CardTitle>Producto & Formato de Envase</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <Field label="Descripción" value={quote.product_description} />
                <Field label="Categoría" value={PRODUCT_LABELS[quote.product_type]} />
                <Field label="Textura" value={TEXTURE_LABELS[quote.product_texture]} />
                <Field label="Volumen (MOQ)" value={`${(quote.volume || 0).toLocaleString('es-ES')} unidades`} />
                <Field label="Contenido / unidad" value={quote.unit_volume_ml ? `${quote.unit_volume_ml} ml/gr` : null} />
                <Field label="Tipo de envase" value={CONTAINER_LABELS[quote.container_type]} />
                <Field label="Material" value={quote.container_material} />
                <Field label="Tipo de cierre" value={quote.closure_type?.replace(/_/g, ' ')} />
                <Field label="Sistema de llenado" value={quote.filling_system?.replace(/_/g, ' ')} />
                <Field label="Etiquetado" value={quote.labeling_system} />
                <Field label="Codificación" value={quote.coding_system} />
                <Field label="Empaquetado secundario" value={quote.packaging_type?.replace(/_/g, ' ')} />
                {quote.special_requirements && (
                  <div className="md:col-span-3">
                    <Field label="Normativas / Certificaciones" value={quote.special_requirements} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLIENTE */}
          <TabsContent value="cliente">
            <Card>
              <CardHeader><CardTitle>Datos del Cliente</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <Field label="Empresa" value={quote.client_company} />
                <Field label="Contacto" value={quote.client_name} />
                <Field label="Email" value={quote.client_email} />
                <Field label="Teléfono" value={quote.client_phone} />
                <Field label="Dirección" value={quote.client_address} />
                <Field label="Modalidad" value={quote.quote_type === 'ENVASADO_SOLO' ? 'Maquila Pura' : 'Servicio 360 / Llave en Mano'} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* MATERIALES */}
          {quote.quote_type === 'SERVICIO_360' && (
            <TabsContent value="materiales">
              <Card>
                <CardHeader>
                  <CardTitle>Materiales Gestionados</CardTitle>
                  <p className="text-sm text-slate-500">Margen de gestión: {ms.margen_gestion || 15}% sobre coste</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { key: 'envase_primario', label: 'Envase Primario' },
                      { key: 'cierre', label: 'Cierre / Tapón' },
                      { key: 'etiqueta', label: 'Etiqueta' },
                      { key: 'packaging_secundario', label: 'Packaging Secundario' },
                      { key: 'materia_prima', label: 'Materia Prima / Granel' },
                    ].map(({ key, label }) => ms[key] && (
                      <div key={key} className="flex items-center justify-between p-3 border dark:border-slate-700 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">✓ {label}</p>
                          {ms[`${key}_descripcion`] && <p className="text-xs text-slate-500">{ms[`${key}_descripcion`]}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm">€{(ms[`${key}_coste`] || 0).toFixed(4)} / ud.</p>
                          <p className="text-xs text-slate-500">+ {ms.margen_gestion || 15}% gestión</p>
                        </div>
                      </div>
                    ))}
                    {quote.distribution_included && (
                      <div className="flex items-center justify-between p-3 border dark:border-slate-700 rounded-lg">
                        <p className="font-semibold text-sm">✓ Distribución incluida</p>
                        <p className="font-mono text-sm">€{fmt(quote.distribution_cost)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* CONDICIONES */}
          <TabsContent value="condiciones">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Condiciones Comerciales</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <Field label="Incoterm" value={cc.incoterm || 'EXW'} />
                  <Field label="Condiciones de pago" value={cc.payment_terms} />
                  <Field label="Validez del presupuesto" value={`${quote.validity_days || 30} días`} />
                  <Field label="Plazo de entrega" value={`${quote.delivery_days || '—'} días laborables`} />
                  <Field label="Almacenaje gratuito" value={`${cc.storage_days_free || 15} días`} />
                  {cc.storage_cost_per_pallet && <Field label="Almacenaje adicional" value={`€${cc.storage_cost_per_pallet}/palet/día`} />}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Condiciones Técnicas</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-6">
                  <Field label="Merma técnica aceptada" value={`${cc.waste_percentage || 3}%`} />
                  <Field label="Prop. intelectual" value={cc.ip_ownership} />
                </CardContent>
              </Card>
              {(quote.notes) && (
                <Card>
                  <CardHeader><CardTitle>Notas del Presupuesto</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{quote.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}