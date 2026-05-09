import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function QuoteFormMaterials({ formData, onChange, onNext, onPrev, quoteType }) {
  if (quoteType === 'ENVASADO_SOLO') {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Servicio de Envasado Únicamente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800">
              En esta modalidad, el cliente proporciona los materiales de envasado y componentes.
              Solo se incluye el servicio de envasado y procesamiento.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev}>
            Anterior
          </Button>
          <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
            Siguiente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Suministro de Materiales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="blisters"
                checked={formData.materials_supply?.blisters || false}
                onCheckedChange={(checked) =>
                  onChange('materials_supply', {
                    ...formData.materials_supply,
                    blisters: checked
                  })
                }
              />
              <Label htmlFor="blisters" className="cursor-pointer">Blísteres/Envases primarios</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="printed_cards"
                checked={formData.materials_supply?.printed_cards || false}
                onCheckedChange={(checked) =>
                  onChange('materials_supply', {
                    ...formData.materials_supply,
                    printed_cards: checked
                  })
                }
              />
              <Label htmlFor="printed_cards" className="cursor-pointer">Tarjetas impresas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="caps"
                checked={formData.materials_supply?.caps || false}
                onCheckedChange={(checked) =>
                  onChange('materials_supply', {
                    ...formData.materials_supply,
                    caps: checked
                  })
                }
              />
              <Label htmlFor="caps" className="cursor-pointer">Tapones/Cierres</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="pumps"
                checked={formData.materials_supply?.pumps || false}
                onCheckedChange={(checked) =>
                  onChange('materials_supply', {
                    ...formData.materials_supply,
                    pumps: checked
                  })
                }
              />
              <Label htmlFor="pumps" className="cursor-pointer">Bombas dosificadoras</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="labels"
                checked={formData.materials_supply?.labels || false}
                onCheckedChange={(checked) =>
                  onChange('materials_supply', {
                    ...formData.materials_supply,
                    labels: checked
                  })
                }
              />
              <Label htmlFor="labels" className="cursor-pointer">Etiquetas impresas</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="other">Otros materiales</Label>
            <Textarea
              id="other"
              value={formData.materials_supply?.other || ''}
              onChange={(e) =>
                onChange('materials_supply', {
                  ...formData.materials_supply,
                  other: e.target.value
                })
              }
              placeholder="Especifica otros materiales..."
              className="h-20"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Servicios Adicionales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="distribution"
              checked={formData.distribution_included || false}
              onCheckedChange={(checked) => onChange('distribution_included', checked)}
            />
            <Label htmlFor="distribution" className="cursor-pointer">
              Incluir distribución a puntos de venta/e-commerce
            </Label>
          </div>
          <p className="text-xs text-slate-600 ml-6">
            Servicio de entrega y distribución del producto envasado
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Anterior
        </Button>
        <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
          Siguiente
        </Button>
      </div>
    </div>
  );
}