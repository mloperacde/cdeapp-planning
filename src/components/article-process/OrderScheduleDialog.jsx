import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toLocalInputValue } from './plannerTime';

const BLANK = {
  order_reference: '',
  product_name: '',
  quantity: '',
  hito_fecha: '',
  source_plan_id: '',
};

export default function OrderScheduleDialog({ open, onOpenChange, templates = [], onCreate, isPending }) {
  const [form, setForm] = useState({ ...BLANK, hito_fecha: toLocalInputValue(new Date().toISOString()) });
  const [error, setError] = useState('');

  const update = (changes) => setForm((f) => ({ ...f, ...changes }));

  const handleSubmit = () => {
    if (!form.order_reference.trim()) {
      setError('Indica la referencia de la orden de trabajo');
      return;
    }
    if (!form.hito_fecha) {
      setError('Indica la fecha y hora del hito de inicio');
      return;
    }
    setError('');
    onCreate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo cronograma de orden</DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Orden de trabajo *</Label>
              <Input
                value={form.order_reference}
                onChange={(e) => update({ order_reference: e.target.value })}
                placeholder="OT-2026-0148"
                className="h-9 text-sm mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs">Cantidad</Label>
              <Input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => update({ quantity: e.target.value })}
                placeholder="1200"
                className="h-9 text-sm mt-0.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Producto</Label>
            <Input
              value={form.product_name}
              onChange={(e) => update({ product_name: e.target.value })}
              placeholder="Producto a envasar"
              className="h-9 text-sm mt-0.5"
            />
          </div>

          <div>
            <Label className="text-xs">Hito · inicio de producción *</Label>
            <Input
              type="datetime-local"
              value={form.hito_fecha}
              onChange={(e) => update({ hito_fecha: e.target.value })}
              className="h-9 text-sm mt-0.5"
            />
          </div>

          <div>
            <Label className="text-xs">Aplicar plantilla</Label>
            <select
              value={form.source_plan_id}
              onChange={(e) => update({ source_plan_id: e.target.value })}
              className="w-full h-9 text-sm border border-input rounded-md px-2 bg-background text-foreground mt-0.5"
            >
              <option value="">Sin plantilla (empezar vacío)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Las actividades de la plantilla se copian al cronograma y podrás ajustarlas.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isPending ? 'Creando...' : 'Crear cronograma'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}