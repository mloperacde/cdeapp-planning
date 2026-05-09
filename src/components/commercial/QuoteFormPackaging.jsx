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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function QuoteFormPackaging({ formData, onChange, onNext, onPrev }) {
  return (
    <div className="space-y-6">
      {/* Tipo de Producto */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Producto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Producto a envasar</Label>
            <Select value={formData.product_type || ''} onValueChange={(value) => onChange('product_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo de producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cosmetico">Cosmético</SelectItem>
                <SelectItem value="perfumeria">Perfumería</SelectItem>
                <SelectItem value="sanitario">Sanitario</SelectItem>
                <SelectItem value="alimenticio">Alimenticio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Volumen y Envase */}
      <Card>
        <CardHeader>
          <CardTitle>Especificaciones de Envasado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Volumen de unidades</Label>
            <Input
              type="number"
              value={formData.volume || ''}
              onChange={(e) => onChange('volume', Number(e.target.value))}
              placeholder="Ej: 50000"
            />
          </div>

          <div>
            <Label>Tipo de envase</Label>
            <Select value={formData.container_type || ''} onValueChange={(value) => onChange('container_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona envase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frasco">Frasco</SelectItem>
                <SelectItem value="bote">Bote</SelectItem>
                <SelectItem value="blister">Blíster</SelectItem>
                <SelectItem value="carton">Cartón Plegable</SelectItem>
                <SelectItem value="bolsa">Bolsa</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sistemas de Procesamiento */}
      <Card>
        <CardHeader>
          <CardTitle>Sistemas de Procesamiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Sistema de llenado</Label>
            <Select value={formData.filling_system || ''} onValueChange={(value) => onChange('filling_system', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bomba_peristaltica">Bomba Peristáltica</SelectItem>
                <SelectItem value="piston">Pistón</SelectItem>
                <SelectItem value="masa">Masa</SelectItem>
                <SelectItem value="volumetrica">Volumétrica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sistema de etiquetado</Label>
            <Select value={formData.labeling_system || ''} onValueChange={(value) => onChange('labeling_system', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="semiautomatico">Semiautomático</SelectItem>
                <SelectItem value="automatico">Automático</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sistema de taponado/cerrado</Label>
            <Select value={formData.capping_system || ''} onValueChange={(value) => onChange('capping_system', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="semiautomatico">Semiautomático</SelectItem>
                <SelectItem value="automatico">Automático</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Línea de Producción */}
      <Card>
        <CardHeader>
          <CardTitle>Línea de Producción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>¿Necesita línea completa o máquinas específicas?</Label>
          <Select value={formData.line_type || ''} onValueChange={(value) => onChange('line_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona opción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linea_completa">Línea Completa Integrada</SelectItem>
              <SelectItem value="maquinas_especificas">Máquinas Específicas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Requisitos Especiales */}
      <Card>
        <CardHeader>
          <CardTitle>Requisitos Especiales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Normativas/Certificaciones requeridas</Label>
            <Textarea
              value={formData.special_requirements || ''}
              onChange={(e) => onChange('special_requirements', e.target.value)}
              placeholder="Ej: GMP, ISO 9001, BPF, etc."
              className="h-24"
            />
          </div>

          <div>
            <Label>Plazo de entrega (días)</Label>
            <Input
              type="number"
              value={formData.delivery_days || ''}
              onChange={(e) => onChange('delivery_days', Number(e.target.value))}
              placeholder="Ej: 30"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
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