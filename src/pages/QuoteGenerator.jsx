import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileText, ChevronRight, ChevronLeft, Package, Wrench, FlaskConical, Euro, AlertCircle, Info } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { calculateQuote } from '@/components/commercial/quoteCalculator';

const STEPS = [
  { id: 1, label: 'Cliente', icon: FileText },
  { id: 2, label: 'Producto', icon: Package },
  { id: 3, label: 'Procesos', icon: Wrench },
  { id: 4, label: 'Materiales', icon: FlaskConical },
  { id: 5, label: 'Resumen', icon: Euro },
];

export default function QuoteGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    quote_type: 'ENVASADO_SOLO',
    status: 'borrador',
    validity_days: 30,
    coding_system: 'inkjet',
    packaging_type: 'ninguno',
    distribution_included: false,
    materials_supply: { margen_gestion: 15 },
    quality_services: {},
    commercial_conditions: {
      waste_percentage: 3,
      incoterm: 'EXW',
      storage_days_free: 15,
      payment_terms: '50% anticipo, 50% contra entrega',
    },
  });

  const calc = useMemo(() => calculateQuote(formData), [formData]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleMaterialsChange = (field, value) => setFormData(prev => ({
    ...prev, materials_supply: { ...prev.materials_supply, [field]: value }
  }));
  const handleQualityChange = (field, value) => setFormData(prev => ({
    ...prev, quality_services: { ...prev.quality_services, [field]: value }
  }));
  const handleConditionsChange = (field, value) => setFormData(prev => ({
    ...prev, commercial_conditions: { ...prev.commercial_conditions, [field]: value }
  }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const quoteNumber = `PRES-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      const payload = {
        ...formData,
        quote_number: quoteNumber,
        ...(calc || {}),
      };
      return base44.entities.QuoteTemplate.create(payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      navigate(`/QuoteDetail/${data.id}`);
    },
  });

  const isStep1Valid = () => formData.client_name && formData.client_email && formData.quote_type;
  const isStep2Valid = () => formData.product_type && formData.product_texture && formData.volume > 0 && formData.container_type;
  const isStep3Valid = () => formData.filling_system && formData.labeling_system;

  const fmt = (n) => (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/QuotesList" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Nuevo Presupuesto</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Paso {step} de {STEPS.length}</p>
          </div>
        </div>
        {/* Live price */}
        {calc && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">Total estimado</p>
            <p className="text-lg font-bold text-green-600">€{fmt(calc.price_breakdown.total)}</p>
            <p className="text-xs text-slate-500">€{fmt(calc.price_breakdown.unit_price)} / ud.</p>
          </div>
        )}
      </header>

      {/* Progress */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 md:px-8 py-3">
        <div className="flex gap-1 md:gap-2 max-w-3xl mx-auto">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <button
                key={s.id}
                onClick={() => done && setStep(s.id)}
                className={`flex-1 flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 px-1 md:px-3 rounded-lg text-xs font-medium transition-all
                  ${active ? 'bg-blue-600 text-white' : done ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                <span className="hidden md:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* ── STEP 1: Cliente ────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Datos del Cliente</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Empresa *</Label>
                    <Input value={formData.client_company || ''} onChange={e => handleChange('client_company', e.target.value)} placeholder="Marca Ejemplo, S.A." />
                  </div>
                  <div>
                    <Label>Nombre de contacto *</Label>
                    <Input value={formData.client_name || ''} onChange={e => handleChange('client_name', e.target.value)} placeholder="Juan García" />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={formData.client_phone || ''} onChange={e => handleChange('client_phone', e.target.value)} placeholder="+34 900 000 000" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={formData.client_email || ''} onChange={e => handleChange('client_email', e.target.value)} placeholder="contacto@empresa.com" />
                  </div>
                  <div>
                    <Label>Dirección</Label>
                    <Input value={formData.client_address || ''} onChange={e => handleChange('client_address', e.target.value)} placeholder="Calle, Nº, Ciudad" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Modalidad del Servicio</CardTitle></CardHeader>
                <CardContent>
                  <Tabs value={formData.quote_type} onValueChange={v => handleChange('quote_type', v)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="ENVASADO_SOLO">Maquila Pura</TabsTrigger>
                      <TabsTrigger value="SERVICIO_360">Servicio 360 / Llave en Mano</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ENVASADO_SOLO" className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                      <p className="font-semibold text-blue-900 dark:text-blue-300">Opción A: Maquila Pura</p>
                      <p className="text-sm text-blue-800 dark:text-blue-400">El cliente envía todos los materiales. Cobramos solo por tiempo de máquina y mano de obra.</p>
                      <ul className="text-xs text-blue-700 dark:text-blue-400 list-disc ml-4 space-y-0.5">
                        <li>Menor precio total</li>
                        <li>Cliente gestiona compra de envases y etiquetas</li>
                        <li>Merma técnica a cargo del cliente (2-5%)</li>
                      </ul>
                    </TabsContent>
                    <TabsContent value="SERVICIO_360" className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
                      <p className="font-semibold text-green-900 dark:text-green-300">Opción B: Full Service 360</p>
                      <p className="text-sm text-green-800 dark:text-green-400">Servicio integral llave en mano. Gestionamos envases, etiquetas y materiales con margen de gestión.</p>
                      <ul className="text-xs text-green-700 dark:text-green-400 list-disc ml-4 space-y-0.5">
                        <li>Precio todo incluido</li>
                        <li>+15% margen sobre materiales gestionados (configurable)</li>
                        <li>Opción de distribución a puntos de venta</li>
                      </ul>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!isStep1Valid()} className="bg-blue-600 hover:bg-blue-700 gap-2">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Producto & Envase ──────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Producto a Envasar</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Descripción del producto</Label>
                    <Input value={formData.product_description || ''} onChange={e => handleChange('product_description', e.target.value)} placeholder="Ej: Crema Hidratante Facial 50ml" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Categoría *</Label>
                      <Select value={formData.product_type || ''} onValueChange={v => handleChange('product_type', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cosmetico">🧴 Cosmético</SelectItem>
                          <SelectItem value="perfumeria">🌸 Perfumería</SelectItem>
                          <SelectItem value="sanitario">⚕️ Sanitario / Médico</SelectItem>
                          <SelectItem value="alimenticio">🥗 Alimenticio</SelectItem>
                          <SelectItem value="otro">📦 Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Textura / Consistencia *</Label>
                      <Select value={formData.product_texture || ''} onValueChange={v => handleChange('product_texture', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="liquido">💧 Líquido</SelectItem>
                          <SelectItem value="crema">🧴 Crema / Pasta espesa</SelectItem>
                          <SelectItem value="gel">🫧 Gel</SelectItem>
                          <SelectItem value="emulsion">💦 Emulsión</SelectItem>
                          <SelectItem value="spray">💨 Spray / Aerosol</SelectItem>
                          <SelectItem value="polvo">🌫️ Polvo</SelectItem>
                          <SelectItem value="solido">🧱 Sólido (barra, pastilla)</SelectItem>
                          <SelectItem value="otro">📦 Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {formData.product_type === 'perfumeria' && (
                    <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Perfumería con alcohol requiere entorno ATEX. Se aplica recargo regulatorio +5%.</span>
                    </div>
                  )}
                  {formData.product_type === 'sanitario' && (
                    <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-800 dark:text-red-300">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Productos sanitarios requieren sala blanca e ISO 13485. Se aplica recargo regulatorio +20%.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Formato de Envase</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cantidad (MOQ) *</Label>
                      <Input type="number" value={formData.volume || ''} onChange={e => handleChange('volume', Number(e.target.value))} placeholder="Ej: 5000" />
                      {formData.volume > 0 && formData.volume < 1000 && (
                        <p className="text-xs text-amber-600 mt-1">⚠ Lotes &lt;1.000 ud. tienen mayor coste de set-up</p>
                      )}
                    </div>
                    <div>
                      <Label>Volumen por unidad (ml/gr)</Label>
                      <Input type="number" value={formData.unit_volume_ml || ''} onChange={e => handleChange('unit_volume_ml', Number(e.target.value))} placeholder="Ej: 50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo de envase *</Label>
                      <Select value={formData.container_type || ''} onValueChange={v => handleChange('container_type', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frasco">🫙 Frasco (cuello estrecho)</SelectItem>
                          <SelectItem value="bote">🥤 Bote (boca ancha)</SelectItem>
                          <SelectItem value="tarro">🫙 Tarro de vidrio</SelectItem>
                          <SelectItem value="tubo">🧴 Tubo laminar</SelectItem>
                          <SelectItem value="sachet">📦 Sachet / Monodosis</SelectItem>
                          <SelectItem value="sachet_toallita">🧻 Sachet con Toallita</SelectItem>
                          <SelectItem value="ampolla">💉 Ampolla / Vial</SelectItem>
                          <SelectItem value="blister">💊 Blíster</SelectItem>
                          <SelectItem value="sobre">✉ Sobre de papel</SelectItem>
                          <SelectItem value="carton">📦 Cartón plegable</SelectItem>
                          <SelectItem value="otro">📦 Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Material del envase</Label>
                      <Select value={formData.container_material || ''} onValueChange={v => handleChange('container_material', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vidrio">🔍 Vidrio</SelectItem>
                          <SelectItem value="pet">♻ PET</SelectItem>
                          <SelectItem value="hdpe">🟡 HDPE</SelectItem>
                          <SelectItem value="aluminio">🔘 Aluminio</SelectItem>
                          <SelectItem value="papel">📄 Papel / Cartón</SelectItem>
                          <SelectItem value="laminado">📋 Laminado (film)</SelectItem>
                          <SelectItem value="otro">📦 Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Tipo de cierre</Label>
                    <Select value={formData.closure_type || ''} onValueChange={v => handleChange('closure_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rosca">🔩 Tapa de rosca (con/sin obturador)</SelectItem>
                        <SelectItem value="flip_top">🔓 Flip-top</SelectItem>
                        <SelectItem value="bomba">💊 Bomba dosificadora</SelectItem>
                        <SelectItem value="spray">💨 Spray / Válvula aerosol</SelectItem>
                        <SelectItem value="gotero">💧 Gotero</SelectItem>
                        <SelectItem value="induccion">🔥 Sellado por inducción</SelectItem>
                        <SelectItem value="soldadura">🔗 Soldadura por calor (sachets)</SelectItem>
                        <SelectItem value="otro">🔧 Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.container_type === 'sachet_toallita') && (
                    <div className="flex gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs text-purple-800 dark:text-purple-300">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Sachets con toallita requieren doble fase: corte/plegado de tejido + impregnación + termosellado. Coste superior. Se presupuesta por millares.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ChevronLeft className="w-4 h-4" />Anterior</Button>
                <Button onClick={() => setStep(3)} disabled={!isStep2Valid()} className="bg-blue-600 hover:bg-blue-700 gap-2">Siguiente <ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Procesos & Línea ───────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Sistemas de Producción</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sistema de llenado *</Label>
                      <Select value={formData.filling_system || ''} onValueChange={v => handleChange('filling_system', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bomba_peristaltica">Bomba Peristáltica (líquidos)</SelectItem>
                          <SelectItem value="piston">Pistón (cremas y geles)</SelectItem>
                          <SelectItem value="masa">Dosificadora de masa (pastas)</SelectItem>
                          <SelectItem value="volumetrica">Volumétrica (líquidos precisión)</SelectItem>
                          <SelectItem value="dosificadora_polvo">Dosificadora de polvo</SelectItem>
                          <SelectItem value="termoformado">Termoformado (blíster)</SelectItem>
                          <SelectItem value="soldadura_calor">Soldadura por calor (sachets)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sistema de etiquetado *</Label>
                      <Select value={formData.labeling_system || ''} onValueChange={v => handleChange('labeling_system', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="semiautomatico">Semiautomático</SelectItem>
                          <SelectItem value="automatico">Automático (alta velocidad)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Codificación Lote/Caducidad</Label>
                      <Select value={formData.coding_system || 'inkjet'} onValueChange={v => handleChange('coding_system', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inkjet">Inkjet</SelectItem>
                          <SelectItem value="laser">Láser</SelectItem>
                          <SelectItem value="termotransferencia">Termotransferencia</SelectItem>
                          <SelectItem value="manual">Manual (tampón)</SelectItem>
                          <SelectItem value="ninguno">No requiere</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Empaquetado secundario</Label>
                      <Select value={formData.packaging_type || 'ninguno'} onValueChange={v => handleChange('packaging_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ninguno">Sin empaquetado secundario</SelectItem>
                          <SelectItem value="estuche">Estuche de cartón + folleto</SelectItem>
                          <SelectItem value="flow_pack">Flow Pack</SelectItem>
                          <SelectItem value="termoretractil">Film termorretráctil</SelectItem>
                          <SelectItem value="film">Film protector</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Requisitos & Condiciones</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Plazo de entrega (días laborables)</Label>
                      <Input type="number" value={formData.delivery_days || ''} onChange={e => handleChange('delivery_days', Number(e.target.value))} placeholder="Ej: 20" />
                    </div>
                    <div>
                      <Label>Validez del presupuesto (días)</Label>
                      <Input type="number" value={formData.validity_days || 30} onChange={e => handleChange('validity_days', Number(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <Label>Normativas / Certificaciones requeridas</Label>
                    <Input value={formData.special_requirements || ''} onChange={e => handleChange('special_requirements', e.target.value)} placeholder="Ej: ISO 22716 (GMP Cosmética), APPCC, ISO 13485..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Incoterm</Label>
                      <Select value={formData.commercial_conditions?.incoterm || 'EXW'} onValueChange={v => handleConditionsChange('incoterm', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXW">EXW (cliente recoge en fábrica)</SelectItem>
                          <SelectItem value="DDP">DDP (entregamos en destino)</SelectItem>
                          <SelectItem value="FCA">FCA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Condiciones de pago</Label>
                      <Input value={formData.commercial_conditions?.payment_terms || ''} onChange={e => handleConditionsChange('payment_terms', e.target.value)} placeholder="Ej: 50% anticipo, 50% entrega" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Servicios de Calidad */}
              <Card>
                <CardHeader><CardTitle>Servicios de Calidad y Regulatorio</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 border dark:border-slate-700 rounded-lg">
                      <Checkbox id="microbio" checked={formData.quality_services?.microbiological_analysis || false} onCheckedChange={v => handleQualityChange('microbiological_analysis', v)} />
                      <div className="flex-1">
                        <Label htmlFor="microbio" className="cursor-pointer font-medium">Análisis microbiológico del lote</Label>
                        <p className="text-xs text-slate-500">Control de calidad obligatorio para cosméticos y sanitarios</p>
                      </div>
                      {formData.quality_services?.microbiological_analysis && (
                        <div className="w-28">
                          <Input type="number" value={formData.quality_services?.microbiological_cost || 250} onChange={e => handleQualityChange('microbiological_cost', Number(e.target.value))} placeholder="€250" className="text-xs h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-3 p-3 border dark:border-slate-700 rounded-lg">
                      <Checkbox id="stability" checked={formData.quality_services?.stability_test || false} onCheckedChange={v => handleQualityChange('stability_test', v)} />
                      <div className="flex-1">
                        <Label htmlFor="stability" className="cursor-pointer font-medium">Pruebas de estabilidad</Label>
                        <p className="text-xs text-slate-500">Test de temperatura/humedad por muestra (€50-500/muestra)</p>
                      </div>
                      {formData.quality_services?.stability_test && (
                        <div className="w-28">
                          <Input type="number" value={formData.quality_services?.stability_cost || 500} onChange={e => handleQualityChange('stability_cost', Number(e.target.value))} placeholder="€500" className="text-xs h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-3 p-3 border dark:border-slate-700 rounded-lg">
                      <Checkbox id="regulatory" checked={formData.quality_services?.regulatory_management || false} onCheckedChange={v => handleQualityChange('regulatory_management', v)} />
                      <div className="flex-1">
                        <Label htmlFor="regulatory" className="cursor-pointer font-medium">Gestión regulatoria (CPNP / Registro)</Label>
                        <p className="text-xs text-slate-500">Notificación CPNP, registro sanitario u otros registros</p>
                      </div>
                      {formData.quality_services?.regulatory_management && (
                        <div className="w-28">
                          <Input type="number" value={formData.quality_services?.regulatory_cost || 800} onChange={e => handleQualityChange('regulatory_cost', Number(e.target.value))} placeholder="€800" className="text-xs h-8" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ChevronLeft className="w-4 h-4" />Anterior</Button>
                <Button onClick={() => setStep(4)} disabled={!isStep3Valid()} className="bg-blue-600 hover:bg-blue-700 gap-2">Siguiente <ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Materiales (360) ───────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              {formData.quote_type === 'ENVASADO_SOLO' ? (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-blue-900 dark:text-blue-200">Modalidad Maquila Pura</p>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">El cliente suministra todos los materiales (envases, tapas, etiquetas, packaging). Solo se facturan los servicios de producción.</p>
                        <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">Se asume una merma técnica del {formData.commercial_conditions?.waste_percentage || 3}% en envases y producto. El cliente debe enviar un excedente suficiente.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Materiales Gestionados (Servicio 360)</CardTitle>
                      <p className="text-sm text-slate-500">Indica qué materiales gestionamos y su coste unitario estimado</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Label className="text-sm w-32 flex-shrink-0">Margen gestión (%)</Label>
                        <Input type="number" value={formData.materials_supply?.margen_gestion || 15} onChange={e => handleMaterialsChange('margen_gestion', Number(e.target.value))} className="w-24 h-8 text-sm" />
                        <p className="text-xs text-slate-500">Recargo por gestión de compras sobre coste de materiales</p>
                      </div>
                      {[
                        { key: 'envase_primario', label: 'Envase Primario', desc: 'Frasco, bote, tarro, sachet...' },
                        { key: 'cierre', label: 'Cierre / Tapón', desc: 'Tapa rosca, bomba, flip-top...' },
                        { key: 'etiqueta', label: 'Etiqueta', desc: 'Frontal, trasera, cuello...' },
                        { key: 'packaging_secundario', label: 'Packaging Secundario', desc: 'Estuche, caja, flow pack...' },
                        { key: 'materia_prima', label: 'Materia Prima / Granel', desc: 'Crema, líquido, gel...' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center gap-3 p-3 border dark:border-slate-700 rounded-lg">
                          <Checkbox id={key} checked={formData.materials_supply?.[key] || false} onCheckedChange={v => handleMaterialsChange(key, v)} />
                          <div className="flex-1">
                            <Label htmlFor={key} className="cursor-pointer font-medium text-sm">{label}</Label>
                            <p className="text-xs text-slate-500">{desc}</p>
                            {formData.materials_supply?.[key] && (
                              <Input value={formData.materials_supply?.[`${key}_descripcion`] || ''} onChange={e => handleMaterialsChange(`${key}_descripcion`, e.target.value)} placeholder="Descripción / especificación" className="mt-2 h-7 text-xs" />
                            )}
                          </div>
                          {formData.materials_supply?.[key] && (
                            <div className="flex flex-col items-end gap-1">
                              <Label className="text-xs text-slate-500">€/ud.</Label>
                              <Input type="number" step="0.001" value={formData.materials_supply?.[`${key}_coste`] || ''} onChange={e => handleMaterialsChange(`${key}_coste`, Number(e.target.value))} placeholder="0.00" className="w-24 h-8 text-sm" />
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Distribución</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox id="distribution" checked={formData.distribution_included || false} onCheckedChange={v => handleChange('distribution_included', v)} />
                        <Label htmlFor="distribution" className="cursor-pointer">Incluir servicio de distribución a puntos de venta / e-commerce</Label>
                      </div>
                      {formData.distribution_included && (
                        <div className="flex gap-3 items-center ml-6">
                          <Label className="text-sm w-32 flex-shrink-0">Coste distribución (€)</Label>
                          <Input type="number" value={formData.distribution_cost || ''} onChange={e => handleChange('distribution_cost', Number(e.target.value))} placeholder="0.00" className="w-32 h-8" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-2"><ChevronLeft className="w-4 h-4" />Anterior</Button>
                <Button onClick={() => setStep(5)} className="bg-blue-600 hover:bg-blue-700 gap-2">Siguiente <ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Resumen ────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-6">
              {calc ? (
                <>
                  {/* Líneas de servicio */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Líneas de Servicio Calculadas</CardTitle>
                      <p className="text-sm text-slate-500">{formData.volume?.toLocaleString()} unidades · {formData.product_description || formData.product_type}</p>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b dark:border-slate-700 text-xs text-slate-500">
                            <th className="text-left pb-2">Cód.</th>
                            <th className="text-left pb-2">Concepto</th>
                            <th className="text-right pb-2">Coste u.</th>
                            <th className="text-right pb-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calc.service_lines.map((line) => (
                            <tr key={line.code} className="border-b dark:border-slate-700/50">
                              <td className="py-2 font-mono text-xs text-blue-600 dark:text-blue-400">{line.code}</td>
                              <td className="py-2">
                                <p className="font-medium">{line.concept}</p>
                                <p className="text-xs text-slate-500 truncate max-w-xs">{line.description}</p>
                              </td>
                              <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                                {line.is_fixed ? `Fijo` : `€${line.unit_cost.toFixed(3)}`}
                              </td>
                              <td className="py-2 text-right font-semibold">€{fmt(line.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totales */}
                      <div className="mt-4 space-y-2 border-t dark:border-slate-700 pt-4">
                        {[
                          { label: 'Subtotal servicios', val: calc.price_breakdown.services_subtotal },
                          calc.price_breakdown.materials_cost > 0 && { label: 'Materiales gestionados', val: calc.price_breakdown.materials_cost },
                          calc.price_breakdown.quality_cost > 0 && { label: 'Calidad y regulatorio', val: calc.price_breakdown.quality_cost },
                          calc.price_breakdown.distribution_cost > 0 && { label: 'Distribución', val: calc.price_breakdown.distribution_cost },
                        ].filter(Boolean).map(({ label, val }) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{label}</span>
                            <span>€{fmt(val)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm border-t dark:border-slate-700 pt-2">
                          <span className="text-slate-600 dark:text-slate-400">Subtotal (sin IVA)</span>
                          <span className="font-semibold">€{fmt(calc.price_breakdown.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">IVA (21%)</span>
                          <span>€{fmt(calc.price_breakdown.tax_amount)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t dark:border-slate-700 pt-2">
                          <span>TOTAL PRESUPUESTO</span>
                          <span className="text-green-600">€{fmt(calc.price_breakdown.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                          <span>Precio unitario (sin IVA)</span>
                          <span className="font-mono">€{calc.price_breakdown.unit_price.toFixed(4)} / ud.</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notas */}
                  <Card>
                    <CardHeader><CardTitle>Notas del Presupuesto</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Notas para el cliente</Label>
                        <Textarea value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)}
                          placeholder="Condiciones especiales, observaciones..." className="h-24" />
                      </div>
                      <div>
                        <Label>Notas internas (no aparecen en el PDF)</Label>
                        <Textarea value={formData.internal_notes || ''} onChange={e => handleChange('internal_notes', e.target.value)}
                          placeholder="Comentarios internos, margen real, negociación..." className="h-16" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                  <CardContent className="pt-6 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-amber-800 dark:text-amber-300">Completa los pasos anteriores para ver el cálculo automático</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="gap-2"><ChevronLeft className="w-4 h-4" />Anterior</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !calc}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {createMutation.isPending ? 'Creando...' : 'Crear Presupuesto'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}