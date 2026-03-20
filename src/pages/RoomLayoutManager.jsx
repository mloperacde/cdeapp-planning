import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, LayoutDashboard, GitBranch, Edit, Trash2, Eye, Copy } from 'lucide-react';
import RoomLayoutEditor from '@/components/layouts/RoomLayoutEditor';
import ProcessDiagramEditor from '@/components/layouts/ProcessDiagramEditor';
import { toast } from 'sonner';

const STATUS_COLORS = {
  'Borrador': 'bg-yellow-100 text-yellow-800',
  'Aprobado': 'bg-green-100 text-green-800',
  'Archivado': 'bg-slate-100 text-slate-600',
  'En Revisión': 'bg-blue-100 text-blue-800',
  'Obsoleto': 'bg-red-100 text-red-800',
};

export default function RoomLayoutManager() {
  const [activeTab, setActiveTab] = useState('layouts');
  const [editingLayout, setEditingLayout] = useState(null); // null = list, 'new' = new, id = edit
  const [editingDiagram, setEditingDiagram] = useState(null);
  const qc = useQueryClient();

  const { data: layouts = [] } = useQuery({
    queryKey: ['RoomLayout'],
    queryFn: () => base44.entities.RoomLayout.list('-created_date'),
  });

  const { data: diagrams = [] } = useQuery({
    queryKey: ['ProcessDiagram'],
    queryFn: () => base44.entities.ProcessDiagram.list('-created_date'),
  });

  const deleteLayout = useMutation({
    mutationFn: (id) => base44.entities.RoomLayout.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['RoomLayout'] }); toast.success('Layout eliminado'); },
  });

  const deleteDiagram = useMutation({
    mutationFn: (id) => base44.entities.ProcessDiagram.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ProcessDiagram'] }); toast.success('Diagrama eliminado'); },
  });

  // Editor de layout abierto
  if (editingLayout !== null) {
    return (
      <RoomLayoutEditor
        layoutId={editingLayout === 'new' ? null : editingLayout}
        onBack={() => setEditingLayout(null)}
      />
    );
  }

  // Editor de diagrama abierto
  if (editingDiagram !== null) {
    return (
      <ProcessDiagramEditor
        diagramId={editingDiagram === 'new' ? null : editingDiagram}
        layouts={layouts}
        onBack={() => setEditingDiagram(null)}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Layouts de Salas y Procesos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Diseña la disposición física de las salas y define los diagramas de proceso con posicionamiento de operarios
          </p>
        </div>
        <Button
          onClick={() => activeTab === 'layouts' ? setEditingLayout('new') : setEditingDiagram('new')}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'layouts' ? 'Nuevo Layout' : 'Nuevo Diagrama'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-border">
        <button
          onClick={() => setActiveTab('layouts')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'layouts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Layouts de Salas ({layouts.length})
        </button>
        <button
          onClick={() => setActiveTab('diagrams')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'diagrams'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Diagramas de Proceso ({diagrams.length})
        </button>
      </div>

      {/* Layouts Tab */}
      {activeTab === 'layouts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {layouts.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <LayoutDashboard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay layouts creados</p>
              <p className="text-sm">Crea el primer layout de sala pulsando "Nuevo Layout"</p>
            </div>
          )}
          {layouts.map(layout => (
            <div key={layout.id} className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">{layout.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{layout.room_name}</p>
                </div>
                <Badge className={`ml-2 flex-shrink-0 text-xs ${STATUS_COLORS[layout.status] || STATUS_COLORS['Borrador']}`}>
                  {layout.status || 'Borrador'}
                </Badge>
              </div>
              {layout.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">{layout.description}</p>
              )}
              <div className="text-xs text-slate-400 mb-3">
                {(layout.layout_elements || []).length} elementos · {layout.canvas_width || 1200}×{layout.canvas_height || 800}px
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setEditingLayout(layout.id)}>
                  <Edit className="w-3 h-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteLayout.mutate(layout.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diagrams Tab */}
      {activeTab === 'diagrams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {diagrams.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay diagramas de proceso creados</p>
              <p className="text-sm">Crea el primer diagrama pulsando "Nuevo Diagrama"</p>
            </div>
          )}
          {diagrams.map(diagram => {
            const linked = layouts.find(l => l.id === diagram.room_layout_id);
            return (
              <div key={diagram.id} className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{diagram.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{diagram.process_name || 'Sin proceso'}</p>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 text-xs ${STATUS_COLORS[diagram.status] || STATUS_COLORS['Borrador']}`}>
                    {diagram.status || 'Borrador'}
                  </Badge>
                </div>
                {linked && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-2">
                    <LayoutDashboard className="w-3 h-3" />
                    {linked.name}
                  </div>
                )}
                <div className="text-xs text-slate-400 mb-3">
                  {(diagram.operator_assignments || []).length} operarios · v{diagram.version || 1}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setEditingDiagram(diagram.id)}>
                    <Edit className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteDiagram.mutate(diagram.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}