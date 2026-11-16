import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, Layers, ListChecks, Package, Save, Settings2 } from 'lucide-react';
import { toLocalInputValue } from './plannerTime';

const TABS = [
  { key: 'cronograma', label: 'Cronograma', icon: ListChecks },
  { key: 'linea', label: 'Línea 3D', icon: Layers },
  { key: 'articulos', label: 'Artículos', icon: Package },
  { key: 'ajustes', label: 'Configuración', icon: Settings2 },
];

const fieldClass = 'h-8 text-xs mt-0.5';

export default function PlannerHeader({
  data,
  patch,
  layouts = [],
  tab,
  setTab,
  saving,
  onBack,
  onSave,
  onExport,
}) {
  const isOrder = (data.tipo || 'Plantilla') === 'Orden';
  const gridClass = isOrder ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-5';

  const handleLine = (id) => {
    const layout = layouts.find((l) => l.id === id);
    patch({ room_layout_id: id, room_layout_name: layout?.name || '' });
  };

  return (
    <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-border flex-shrink-0">
      <div className="flex items-center gap-2 px-2 sm:px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 h-8 px-2 flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Volver</span>
        </Button>
        <Input
          value={data.nombre || ''}
          onChange={(e) => patch({ nombre: e.target.value })}
          placeholder={isOrder ? 'OT · producto' : 'Nombre de la plantilla'}
          className="h-8 flex-1 font-semibold border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
        />
        <Badge className={`text-[10px] flex-shrink-0 ${isOrder ? 'bg-blue-100 text-blue-800' : 'bg-violet-100 text-violet-800'}`}>
          {isOrder ? 'Orden' : 'Plantilla'}
        </Badge>
        <Button size="sm" variant="outline" className="h-8 px-2 gap-1" onClick={onExport} title="Exportar JSON">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden lg:inline text-xs">Exportar plan</span>
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">{saving ? 'Guardando...' : 'Guardar'}</span>
        </Button>
      </div>

      <div className={`px-2 sm:px-3 pb-2 grid ${gridClass} gap-2`}>
        {isOrder ? (
          <>
            <div>
              <Label className="text-[10px] text-slate-500">Orden de trabajo</Label>
              <Input
                value={data.order_reference || ''}
                onChange={(e) => patch({ order_reference: e.target.value })}
                placeholder="OT-2026-0148"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Producto</Label>
              <Input
                value={data.product_name || ''}
                onChange={(e) => patch({ product_name: e.target.value })}
                placeholder="Producto a envasar"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Cantidad</Label>
              <Input
                type="number"
                min={0}
                value={data.quantity ?? ''}
                onChange={(e) => patch({ quantity: Number(e.target.value) || 0 })}
                placeholder="1200"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Hito · inicio de producción</Label>
              <Input
                type="datetime-local"
                value={toLocalInputValue(data.hito_fecha)}
                onChange={(e) => patch({ hito_fecha: e.target.value })}
                className={fieldClass}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-[10px] text-slate-500">Código</Label>
              <Input
                value={data.codigo || ''}
                onChange={(e) => patch({ codigo: e.target.value })}
                placeholder="PLAN-001"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Línea de envasado</Label>
              <select
                value={data.room_layout_id || ''}
                onChange={(e) => handleLine(e.target.value)}
                className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background text-foreground mt-0.5"
              >
                <option value="">Sin línea</option>
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Hito de referencia</Label>
              <Input
                value={data.hito_nombre || ''}
                onChange={(e) => patch({ hito_nombre: e.target.value })}
                placeholder="Inicio de producción"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Fecha del hito (opcional)</Label>
              <Input
                type="datetime-local"
                value={toLocalInputValue(data.hito_fecha)}
                onChange={(e) => patch({ hito_fecha: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Estado</Label>
              <select
                value={data.status || 'Borrador'}
                onChange={(e) => patch({ status: e.target.value })}
                className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background text-foreground mt-0.5"
              >
                {['Borrador', 'En Revisión', 'Aprobado', 'Obsoleto'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-0 px-2 sm:px-3 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}