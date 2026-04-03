import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Clock, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import InterventionChangeSummary from '@/components/planning/InterventionChangeSummary';

const TYPE_COLORS = {
  'Mecánico':  'bg-orange-100 text-orange-800',
  'Calidad':   'bg-blue-100 text-blue-800',
  'Supply':    'bg-purple-100 text-purple-800',
  'Almacén':   'bg-green-100 text-green-800',
  'Otros':     'bg-slate-100 text-slate-700',
};

const EMPTY_FORM = {
  name: '', type: 'Mecánico', duration_minutes: 30, description: '',
  applies_to_machine_type: '', trigger_condition: 'Siempre',
  order: 1, required_personnel: 1, notes: '', active: true
};

export default function InterventionConfigPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('Todos');
  const [activeTab, setActiveTab] = useState('config');

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.InterventionConfig.list('-created_date', 100);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY_FORM); setEditingId(null); setDialogOpen(true); };
  const openEdit = (item) => {
    setForm({ ...EMPTY_FORM, ...item });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.type || !form.duration_minutes) {
      toast.error('Nombre, tipo y duración son obligatorios');
      return;
    }
    setSaving(true);
    if (editingId) {
      await base44.entities.InterventionConfig.update(editingId, form);
      toast.success('Intervención actualizada');
    } else {
      await base44.entities.InterventionConfig.create(form);
      toast.success('Intervención creada');
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta intervención?')) return;
    await base44.entities.InterventionConfig.delete(id);
    toast.success('Eliminada');
    load();
  };

  const filtered = filterType === 'Todos' ? items : items.filter(i => i.type === filterType);
  const grouped = ['Mecánico', 'Calidad', 'Supply', 'Almacén', 'Otros'].reduce((acc, t) => {
    acc[t] = filtered.filter(i => i.type === t);
    return acc;
  }, {});

  const totalMinutes = items.filter(i => i.active).reduce((s, i) => s + (i.duration_minutes || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración de Intervenciones</h1>
          <p className="text-sm text-slate-500 mt-1">Tiempos entre cambios de orden de producción</p>
        </div>
        {activeTab === 'config' && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Intervención
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" /> Intervenciones
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'summary'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" /> Resumen de Cambios
        </button>
      </div>

      {activeTab === 'summary' && (
        <InterventionChangeSummary interventionConfigs={items} />
      )}

      {activeTab === 'config' && (<>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Mecánico', 'Calidad', 'Supply', 'Almacén'].map(t => {
          const count = items.filter(i => i.type === t && i.active).length;
          const mins = items.filter(i => i.type === t && i.active).reduce((s, i) => s + (i.duration_minutes || 0), 0);
          return (
            <Card key={t}>
              <CardContent className="p-4">
                <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${TYPE_COLORS[t]}`}>{t}</div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
                <p className="text-xs text-slate-500">{mins} min total</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['Todos', 'Mecánico', 'Calidad', 'Supply', 'Almacén', 'Otros'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, list]) => list.length === 0 ? null : (
            <div key={type}>
              <h3 className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3 ${TYPE_COLORS[type]}`}>{type}</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map(item => (
                  <Card key={item.id} className={`border ${!item.active ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.trigger_condition}</p>
                          {item.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.duration_minutes} min</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{item.required_personnel || 1} pers.</span>
                          </div>
                          {item.applies_to_machine_type && (
                            <Badge variant="outline" className="mt-2 text-xs">{item.applies_to_machine_type}</Badge>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay intervenciones configuradas</p>
              <Button onClick={openNew} variant="outline" className="mt-4">Crear primera intervención</Button>
            </div>
          )}
        </div>
      )}
      </>)}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Nueva'} Intervención</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej: Limpieza mayor" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo *</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Mecánico', 'Calidad', 'Supply', 'Almacén', 'Otros'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Duración (min) *</label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} className="mt-1" min={1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Condición</label>
                <Select value={form.trigger_condition} onValueChange={v => setForm(f => ({ ...f, trigger_condition: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Siempre', 'Cambio de producto', 'Cambio de formato', 'Cambio de cliente'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Personal requerido</label>
                <Input type="number" value={form.required_personnel} onChange={e => setForm(f => ({ ...f, required_personnel: +e.target.value }))} className="mt-1" min={1} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Aplica a tipo de máquina</label>
              <Input value={form.applies_to_machine_type} onChange={e => setForm(f => ({ ...f, applies_to_machine_type: e.target.value }))} placeholder="Sobres, Frascos... (vacío = todas)" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tareas a realizar..." className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
              <label htmlFor="active" className="text-sm text-slate-700 dark:text-slate-300">Activa</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}