import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuoteFormPackaging } from '@/components/commercial/QuoteFormPackaging';
import { QuoteFormMaterials } from '@/components/commercial/QuoteFormMaterials';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuoteGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [quoteType, setQuoteType] = useState('ENVASADO_SOLO');
  const [formData, setFormData] = useState({
    quote_type: 'ENVASADO_SOLO',
    status: 'borrador',
  });

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      const quoteNumber = `QUOTE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      return base44.entities.QuoteTemplate.create({
        ...formData,
        quote_number: quoteNumber,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      navigate(`/QuoteDetail/${data.id}`);
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type) => {
    setQuoteType(type);
    setFormData(prev => ({ ...prev, quote_type: type }));
  };

  const isStep1Valid = () => {
    return (
      formData.client_name &&
      formData.client_email &&
      formData.quote_type &&
      formData.product_type &&
      formData.volume &&
      formData.container_type
    );
  };

  const isStep2Valid = () => {
    return (
      formData.filling_system &&
      formData.labeling_system &&
      formData.capping_system &&
      formData.line_type &&
      formData.delivery_days
    );
  };

  return (
    <div className="h-full flex flex-col p-3 md:p-6 gap-4 md:gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Generador de Presupuestos</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Paso {step} de 4
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 md:gap-6 max-w-3xl mx-auto w-full">
        {/* Progress Bar */}
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step 1: Client & Quote Type */}
        {step === 1 && (
          <div className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre del cliente</Label>
                    <Input
                      value={formData.client_name || ''}
                      onChange={(e) => handleChange('client_name', e.target.value)}
                      placeholder="Juan García"
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={formData.client_phone || ''}
                      onChange={(e) => handleChange('client_phone', e.target.value)}
                      placeholder="+34 900 000 000"
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.client_email || ''}
                    onChange={(e) => handleChange('client_email', e.target.value)}
                    placeholder="cliente@empresa.com"
                  />
                </div>
                <div>
                  <Label>Empresa</Label>
                  <Input
                    value={formData.client_company || ''}
                    onChange={(e) => handleChange('client_company', e.target.value)}
                    placeholder="Nombre de la empresa"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipo de Presupuesto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={quoteType} onValueChange={handleTypeChange}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ENVASADO_SOLO">Solo Envasado</TabsTrigger>
                    <TabsTrigger value="SERVICIO_360">Servicio 360</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ENVASADO_SOLO" className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Servicio de Envasado</h4>
                    <p className="text-sm text-slate-600">
                      Solo incluye el servicio de envasado, etiquetado y procesamiento.
                      El cliente proporciona los materiales.
                    </p>
                  </TabsContent>

                  <TabsContent value="SERVICIO_360" className="mt-4 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Servicio 360</h4>
                    <p className="text-sm text-slate-600">
                      Incluye envasado + suministro de materiales + distribución.
                      Servicio integral llave en mano.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!isStep1Valid()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Packaging */}
        {step === 2 && (
          <QuoteFormPackaging
            formData={formData}
            onChange={handleChange}
            onNext={() => setStep(3)}
            onPrev={() => setStep(1)}
          />
        )}

        {/* Step 3: Materials */}
        {step === 3 && (
          <QuoteFormMaterials
            formData={formData}
            onChange={handleChange}
            quoteType={quoteType}
            onNext={() => setStep(4)}
            onPrev={() => setStep(2)}
          />
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-900">Listo para guardar</h3>
                    <p className="text-sm text-green-800">Revisa los datos antes de crear el presupuesto</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen del Presupuesto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Cliente</p>
                    <p className="font-semibold">{formData.client_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Email</p>
                    <p className="font-semibold">{formData.client_email}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Tipo</p>
                    <p className="font-semibold">{quoteType === 'ENVASADO_SOLO' ? 'Solo Envasado' : 'Servicio 360'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Producto</p>
                    <p className="font-semibold capitalize">{formData.product_type}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Volumen</p>
                    <p className="font-semibold">{formData.volume?.toLocaleString()} unidades</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Plazo entrega</p>
                    <p className="font-semibold">{formData.delivery_days} días</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label>Notas adicionales</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Notas o comentarios adicionales..."
                className="h-20"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>
                Anterior
              </Button>
              <Button
                onClick={() => createQuoteMutation.mutate()}
                disabled={createQuoteMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createQuoteMutation.isPending ? 'Creando...' : 'Crear Presupuesto'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}