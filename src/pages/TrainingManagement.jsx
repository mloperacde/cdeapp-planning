import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Plus, Search, BookOpen, Users, Filter, Sparkles, ChevronRight, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import TrainingModuleEditor from '@/components/training/TrainingModuleEditor';
import TrainingAssignmentPanel from '@/components/training/TrainingAssignmentPanel';
import TrainingDashboardStats from '@/components/training/TrainingDashboardStats';

const STATUS_COLORS = {
  'Borrador': 'bg-slate-100 text-slate-600',
  'En Revisión': 'bg-yellow-100 text-yellow-700',
  'Publicado': 'bg-green-100 text-green-700',
  'Archivado': 'bg-red-100 text-red-600',
};



const NIVEL_COLORS = {
  'Básico': 'bg-green-50 text-green-700 border-green-200',
  'Intermedio': 'bg-blue-50 text-blue-700 border-blue-200',
  'Avanzado': 'bg-orange-50 text-orange-700 border-orange-200',
  'Especialista': 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function TrainingManagement() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | editor | detail
  const [selectedModule, setSelectedModule] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('modules');

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['training-programs'],
    queryFn: () => base44.entities.TrainingProgram.list('-updated_date', 200)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingProgram.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-programs'] })
  });

  const filtered = modules.filter(m => {
    const matchSearch = !search || m.titulo?.toLowerCase().includes(search.toLowerCase()) || m.codigoModulo?.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || m.departamentos?.includes(filterDept);
    const matchStatus = filterStatus === 'all' || m.estado === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  // Views
  if (view === 'editor') {
    return (
      <div className="h-full">
        <TrainingModuleEditor
          module={selectedModule}
          onBack={() => { setView('list'); setSelectedModule(null); }}
        />
      </div>
    );
  }

  if (view === 'detail') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b bg-white dark:bg-card flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); setSelectedModule(null); }} className="gap-2">
            ← Volver
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900 dark:text-white">{selectedModule?.titulo}</h2>
            <p className="text-xs text-slate-500">{selectedModule?.codigoModulo} · {selectedModule?.categoria}</p>
          </div>
          <Badge className={STATUS_COLORS[selectedModule?.estado] || 'bg-slate-100 text-slate-600'}>
            {selectedModule?.estado}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setView('editor')}>Editar Módulo</Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="assignments">
            <div className="px-4 pt-3 border-b bg-white dark:bg-card">
              <TabsList>
                <TabsTrigger value="assignments">Asignaciones y Seguimiento</TabsTrigger>
                <TabsTrigger value="preview">Vista del Material</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="assignments">
              <TrainingAssignmentPanel module={selectedModule} />
            </TabsContent>
            <TabsContent value="preview" className="p-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {selectedModule?.objetivos && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Objetivos de Aprendizaje</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{selectedModule.objetivos}</p>
                  </div>
                )}
                {selectedModule?.contenido && (
                  <div className="bg-white dark:bg-card border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Material de Estudio</h3>
                    <div className="prose prose-sm max-w-none dark:prose-invert text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {selectedModule.contenido}
                    </div>
                  </div>
                )}
                {!selectedModule?.contenido && (
                  <div className="text-center py-12 text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Este módulo aún no tiene material de estudio.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setView('editor')}>
                      Ir al Editor
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 md:p-6 gap-4 md:gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Gestión de Formación</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">Programas formativos para co-packing y envasado industrial</p>
          </div>
        </div>
        <Button onClick={() => { setSelectedModule(null); setView('editor'); }} className="gap-2 bg-blue-600 hover:bg-blue-700 h-8" size="sm">
          <Plus className="w-4 h-4" /> Nuevo Módulo
        </Button>
      </div>

      <div className="space-y-4">
      {/* Stats */}
      <TrainingDashboardStats />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="modules" className="gap-2"><BookOpen className="w-4 h-4" />Módulos Formativos</TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2"><Users className="w-4 h-4" />Seguimiento Global</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar módulo..." className="pl-9" />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-44"><Filter className="w-3 h-3 mr-2" /><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {['Almacén', 'Mantenimiento', 'Calidad', 'Planificación', 'Producción'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {['Borrador', 'En Revisión', 'Publicado', 'Archivado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Grid de módulos */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay módulos formativos</p>
              <p className="text-sm mt-1">Crea el primero con el botón "Nuevo Módulo"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(m => (
                <div key={m.id} className="bg-white dark:bg-card border rounded-xl hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelectedModule(m); setView('detail'); }}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs text-slate-400 font-mono mb-1">{m.codigoModulo || '---'}</p>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight line-clamp-2">{m.titulo}</h3>
                      </div>
                      <Badge className={`${STATUS_COLORS[m.estado] || 'bg-slate-100 text-slate-600'} text-xs flex-shrink-0`}>{m.estado}</Badge>
                    </div>
                    {m.descripcion && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{m.descripcion}</p>}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {m.departamentos?.slice(0, 3).map(dep => (
                        <Badge key={dep} className={`${DEPT_COLORS[dep] || 'bg-slate-100 text-slate-600'} text-xs`}>{dep}</Badge>
                      ))}
                      {m.departamentos?.length > 3 && <Badge className="bg-slate-100 text-slate-500 text-xs">+{m.departamentos.length - 3}</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${NIVEL_COLORS[m.nivel] || ''}`}>{m.nivel || 'Básico'}</Badge>
                        {m.duracionHoras && <span className="text-xs text-slate-400">{m.duracionHoras}h</span>}
                        {m.generadoPorIA && <Sparkles className="w-3 h-3 text-purple-500" title="Generado por IA" />}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setSelectedModule(m); setView('editor'); }}>
                          ✎
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={e => { e.stopPropagation(); if(confirm('¿Eliminar este módulo?')) deleteMutation.mutate(m.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracking">
          <GlobalTrackingView />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

function GlobalTrackingView() {
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: assignments = [] } = useQuery({
    queryKey: ['training-assignments-all'],
    queryFn: () => base44.entities.TrainingAssignment.list('-fechaAsignacion', 500)
  });

  const filtered = assignments.filter(a => {
    const matchDept = filterDept === 'all' || a.employeeDepartamento === filterDept;
    const matchStatus = filterStatus === 'all' || a.estado === filterStatus;
    return matchDept && matchStatus;
  });

  const STATUS_ICON = { 'Asignado': Clock, 'En Progreso': Clock, 'Completado': CheckCircle2, 'Vencido': AlertCircle, 'Cancelado': AlertCircle };
  const STATUS_COLOR = { 'Asignado': 'text-blue-500', 'En Progreso': 'text-yellow-500', 'Completado': 'text-green-500', 'Vencido': 'text-red-500', 'Cancelado': 'text-slate-400' };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Departamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {['Almacén', 'Mantenimiento', 'Calidad', 'Planificación', 'Producción'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {['Asignado', 'En Progreso', 'Completado', 'Vencido', 'Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No hay asignaciones registradas</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Empleado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Módulo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Departamento</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Fecha Límite</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Puntuación</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(a => {
                const Icon = STATUS_ICON[a.estado] || Clock;
                const iconColor = STATUS_COLOR[a.estado] || 'text-slate-400';
                return (
                  <tr key={a.id} className="bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{a.employeeName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-48 truncate">{a.trainingModuleTitulo}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${DEPT_COLORS[a.employeeDepartamento] || 'bg-slate-100 text-slate-600'} text-xs`}>{a.employeeDepartamento || '-'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                        <span className="text-xs">{a.estado}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{a.fechaLimite || '-'}</td>
                    <td className="px-4 py-3">
                      {a.puntuacion != null ? (
                        <Badge className={a.superado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {a.puntuacion}%
                        </Badge>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const DEPT_COLORS = {
  'Almacén': 'bg-orange-100 text-orange-700',
  'Mantenimiento': 'bg-blue-100 text-blue-700',
  'Calidad': 'bg-purple-100 text-purple-700',
  'Planificación': 'bg-cyan-100 text-cyan-700',
  'Producción': 'bg-emerald-100 text-emerald-700',
};