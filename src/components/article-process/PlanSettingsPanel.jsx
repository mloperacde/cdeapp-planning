import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PlanSettingsPanel({ data, onChange }) {
  const { data: processes = [] } = useQuery({
    queryKey: ['Process', 'article-process'],
    queryFn: () => base44.entities.Process.list('nombre'),
    staleTime: 5 * 60 * 1000,
  });

  const handleProcessChange = (id) => {
    const proc = processes.find(p => p.id === id);
    onChange({ process_id: id, process_name: proc?.nombre || '' });
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <Label>Código</Label>
        <Input
          value={data.codigo || ''}
          onChange={e => onChange({ codigo: e.target.value })}
          placeholder="Ej: DP-ENV-001"
          className="h-9 mt-1"
        />
      </div>

      <div>
        <Label>Proceso vinculado</Label>
        <select
          value={data.process_id || ''}
          onChange={e => handleProcessChange(e.target.value)}
          className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background mt-1"
        >
          <option value="">-- Sin proceso --</option>
          {processes.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}{p.codigo ? ` (${p.codigo})` : ''}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Hito de referencia</Label>
        <Input
          value={data.hito_nombre || ''}
          onChange={e => onChange({ hito_nombre: e.target.value })}
          placeholder="Inicio de producción"
          className="h-9 mt-1"
        />
        <p className="text-xs text-slate-500 mt-1">
          Los tiempos de cada actividad se expresan en minutos respecto a este hito (negativo = antes).
        </p>
      </div>

      <div>
        <Label>Descripción</Label>
        <textarea
          value={data.descripcion || ''}
          onChange={e => onChange({ descripcion: e.target.value })}
          placeholder="Descripción del diagrama de proceso..."
          className="w-full text-sm border border-input rounded-md p-2 h-24 resize-none bg-background text-foreground mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Versión</Label>
          <Input
            type="number" min={1}
            value={data.version || 1}
            onChange={e => onChange({ version: Number(e.target.value) || 1 })}
            className="h-9 mt-1"
          />
        </div>
        <div>
          <Label>Estado</Label>
          <select
            value={data.status || 'Borrador'}
            onChange={e => onChange({ status: e.target.value })}
            className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background mt-1"
          >
            {['Borrador', 'En Revisión', 'Aprobado', 'Obsoleto'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>Notas</Label>
        <textarea
          value={data.notes || ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Observaciones, componentes, validaciones de arranque..."
          className="w-full text-sm border border-input rounded-md p-2 h-20 resize-none bg-background text-foreground mt-1"
        />
      </div>
    </div>
  );
}