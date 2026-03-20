import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const SEVERITIES = ['Baja', 'Media', 'Alta', 'Crítica'];
const STATUSES = ['Pendiente', 'En Progreso', 'Resuelto', 'Verificado'];
const CATEGORIES = ['Mecánico', 'Eléctrico', 'Software', 'Proceso', 'Seguridad', 'Documentación'];

const SEVERITY_COLORS = {
  Baja: 'bg-green-100 text-green-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Alta: 'bg-orange-100 text-orange-700',
  Crítica: 'bg-red-100 text-red-700',
};

function FindingCard({ finding, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[finding.severity] || 'bg-gray-100'}`}>
            {finding.severity || 'Sin severidad'}
          </span>
          <span className="font-medium text-sm text-slate-800 dark:text-white truncate">
            {finding.title || 'Hallazgo sin título'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500">{finding.status}</span>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-7 w-7 text-red-500 hover:text-red-700">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 bg-white dark:bg-card">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={finding.title || ''} onChange={(e) => onChange({ ...finding, title: e.target.value })} className="mt-1 h-8 text-sm" placeholder="Título del hallazgo" />
          </div>
          <div>
            <Label className="text-xs">Descripción</Label>
            <textarea
              value={finding.description || ''}
              onChange={(e) => onChange({ ...finding, description: e.target.value })}
              rows={3}
              placeholder="Descripción detallada del hallazgo..."
              className="mt-1 w-full rounded-md border border-slate-200 dark:border-border bg-white dark:bg-input px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Severidad</Label>
              <Select value={finding.severity} onValueChange={(v) => onChange({ ...finding, severity: v })}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={finding.status} onValueChange={(v) => onChange({ ...finding, status: v })}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={finding.category} onValueChange={(v) => onChange({ ...finding, category: v })}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Acción Correctiva</Label>
            <textarea
              value={finding.accionCorrectiva || ''}
              onChange={(e) => onChange({ ...finding, accionCorrectiva: e.target.value })}
              rows={2}
              placeholder="Acción correctiva propuesta..."
              className="mt-1 w-full rounded-md border border-slate-200 dark:border-border bg-white dark:bg-input px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Responsable</Label>
              <Input value={finding.responsable || ''} onChange={(e) => onChange({ ...finding, responsable: e.target.value })} className="mt-1 h-8 text-sm" placeholder="Nombre" />
            </div>
            <div>
              <Label className="text-xs">Fecha Límite</Label>
              <Input type="date" value={finding.fechaLimite || ''} onChange={(e) => onChange({ ...finding, fechaLimite: e.target.value })} className="mt-1 h-8 text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportFindings({ data, onChange }) {
  const findings = data.hallazgos || [];

  const addFinding = () => {
    const newF = {
      id: `f-${Date.now()}`,
      title: '',
      description: '',
      severity: 'Media',
      status: 'Pendiente',
      category: 'Proceso',
      accionCorrectiva: '',
      responsable: '',
      fechaLimite: '',
    };
    onChange({ hallazgos: [...findings, newF] });
  };

  const updateFinding = (index, updated) => {
    const updated_list = [...findings];
    updated_list[index] = updated;
    onChange({ hallazgos: updated_list });
  };

  const deleteFinding = (index) => {
    onChange({ hallazgos: findings.filter((_, i) => i !== index) });
  };

  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Hallazgos Técnicos</h3>
          <p className="text-xs text-slate-500">{findings.length} hallazgo(s) registrado(s)</p>
        </div>
        <Button onClick={addFinding} size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Añadir Hallazgo
        </Button>
      </div>

      {findings.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-border rounded-xl">
          <p className="text-slate-400 text-sm">No hay hallazgos registrados</p>
          <Button onClick={addFinding} variant="outline" size="sm" className="mt-3 gap-1">
            <Plus className="w-4 h-4" /> Añadir primer hallazgo
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f, i) => (
            <FindingCard
              key={f.id || i}
              finding={f}
              onChange={(updated) => updateFinding(i, updated)}
              onDelete={() => deleteFinding(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}