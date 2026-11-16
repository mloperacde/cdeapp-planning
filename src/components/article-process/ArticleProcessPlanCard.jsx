import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Download, Edit, GitBranch, Layers, Package, Trash2 } from 'lucide-react';
import { formatMinutes, formatHitoDate } from './plannerTime';

const STATUS_COLORS = {
  'Borrador': 'bg-slate-100 text-slate-600',
  'En Revisión': 'bg-blue-100 text-blue-800',
  'Aprobado': 'bg-green-100 text-green-800',
  'Obsoleto': 'bg-red-100 text-red-800',
};

export default function ArticleProcessPlanCard({ plan, articleCount, onEdit, onDuplicate, onDelete, onExport }) {
  const total = (plan.actividades || []).reduce((s, a) => s + (Number(a.duracion_minutos) || 0), 0);
  const families = plan.familias || [];
  const isOrder = plan.tipo === 'Orden';

  return (
    <div className="group bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{plan.nombre}</h3>
          <p className="text-xs text-slate-500 truncate">
            {isOrder
              ? `${plan.order_reference || 'Sin OT'}${plan.quantity ? ` · ${plan.quantity} uds` : ''}`
              : plan.codigo || 'Sin código'}
          </p>
        </div>
        <Badge className={`text-[10px] flex-shrink-0 ${STATUS_COLORS[plan.status] || STATUS_COLORS['Borrador']}`}>
          {plan.status || 'Borrador'}
        </Badge>
      </div>

      {isOrder && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mb-1.5">
          <Package className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
          <span className="truncate">{plan.product_name || 'Sin producto'}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 mb-2">
        <Layers className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{plan.room_layout_name || 'Sin línea asignada'}</span>
      </div>

      {isOrder ? (
        <div className="text-[11px] text-slate-500 mb-2">
          Hito: {formatHitoDate(plan.hito_fecha)}
        </div>
      ) : (
        families.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {families.slice(0, 3).map((f) => (
              <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">
                {f}
              </span>
            ))}
            {families.length > 3 && (
              <span className="text-[10px] text-slate-400">+{families.length - 3}</span>
            )}
          </div>
        )
      )}

      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3">
        {!isOrder && (
          <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{articleCount} art.</span>
        )}
        <span>{(plan.actividades || []).length} actividades</span>
        <span>{formatMinutes(total)}</span>
      </div>

      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="flex-1 gap-1 h-8" onClick={onEdit}>
          <Edit className="w-3.5 h-3.5" /> Abrir
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-slate-500 hover:text-blue-600 px-2" onClick={onDuplicate} title="Duplicar">
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-slate-500 hover:text-blue-600 px-2" onClick={onExport} title="Exportar JSON">
          <Download className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-red-500 hover:text-red-700 px-2" onClick={onDelete} title="Eliminar">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}