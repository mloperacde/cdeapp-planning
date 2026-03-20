import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Save, ArrowLeft, Bot, Sparkles, BookOpen, ClipboardCheck, FileText } from 'lucide-react';
import TrainingAIChat from './TrainingAIChat';
import TrainingPDFExport from './TrainingPDFExport';
import ReactMarkdown from 'react-markdown';

const DEPARTAMENTOS = ['Almacén', 'Mantenimiento', 'Calidad', 'Planificación', 'Producción'];
const CATEGORIAS = [
  'Seguridad y PRL', 'Procesos de Envasado', 'Calidad y GMP', 'Mantenimiento',
  'Almacén y Logística', 'Planificación', 'Fabricación de Cosméticos',
  'Fabricación de Sanitarios', 'Etiquetado y Codificación',
  'Gestión de Equipos', 'Normativa y Cumplimiento', 'Habilidades Transversales'
];

export default function TrainingModuleEditor({ module, onBack }) {
  const queryClient = useQueryClient();
  const isNew = !module?.id;
  const [data, setData] = useState(module || {
    titulo: '', descripcion: '', departamentos: [], nivel: 'Básico',
    categoria: '', puestosObjetivo: [], duracionHoras: 4, estado: 'Borrador',
    objetivos: '', contenido: '', evaluacion: '', bibliografia: '',
    normativaReferencia: '', esObligatorio: false, periodicidadMeses: 0,
    autor: '', codigoModulo: '', generadoPorIA: false
  });
  const [showAI, setShowAI] = useState(false);
  const [previewContent, setPreviewContent] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (d) => isNew
      ? base44.entities.TrainingProgram.create(d)
      : base44.entities.TrainingProgram.update(module.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      if (isNew) onBack();
    }
  });

  const toggleDep = (dep) => {
    setData(prev => ({
      ...prev,
      departamentos: prev.departamentos?.includes(dep)
        ? prev.departamentos.filter(d => d !== dep)
        : [...(prev.departamentos || []), dep]
    }));
  };

  const handleAIContentUpdate = (field, value) => {
    setData(prev => ({ ...prev, [field]: value, generadoPorIA: true }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              {isNew ? 'Nuevo Módulo de Formación' : data.titulo || 'Editar Módulo'}
            </h2>
            <p className="text-xs text-slate-500">{isNew ? '' : `Código: ${data.codigoModulo || '-'}`}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <TrainingPDFExport module={data} />
          <Button variant="outline" size="sm" onClick={() => setShowAI(!showAI)} className="gap-2">
            <Bot className="w-4 h-4" />
            {showAI ? 'Ocultar IA' : 'Asistente IA'}
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor principal */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="info" className="h-full">
            <div className="px-4 pt-3 border-b bg-white dark:bg-card">
              <TabsList>
                <TabsTrigger value="info" className="gap-2"><FileText className="w-3 h-3" />Información</TabsTrigger>
                <TabsTrigger value="contenido" className="gap-2"><BookOpen className="w-3 h-3" />Material</TabsTrigger>
                <TabsTrigger value="evaluacion" className="gap-2"><ClipboardCheck className="w-3 h-3" />Evaluación</TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: Info */}
            <TabsContent value="info" className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Título del Módulo *</Label>
                  <Input value={data.titulo} onChange={e => setData(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Seguridad en Líneas de Envasado de Frascos" className="mt-1" />
                </div>
                <div>
                  <Label>Código del Módulo</Label>
                  <Input value={data.codigoModulo} onChange={e => setData(p => ({ ...p, codigoModulo: e.target.value }))} placeholder="Ej: FORM-PRD-001" className="mt-1" />
                </div>
                <div>
                  <Label>Duración (horas)</Label>
                  <Input type="number" value={data.duracionHoras} onChange={e => setData(p => ({ ...p, duracionHoras: parseFloat(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <Label>Nivel</Label>
                  <Select value={data.nivel} onValueChange={v => setData(p => ({ ...p, nivel: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Básico', 'Intermedio', 'Avanzado', 'Especialista'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Select value={data.categoria} onValueChange={v => setData(p => ({ ...p, categoria: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={data.estado} onValueChange={v => setData(p => ({ ...p, estado: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Borrador', 'En Revisión', 'Publicado', 'Archivado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Autor</Label>
                  <Input value={data.autor} onChange={e => setData(p => ({ ...p, autor: e.target.value }))} placeholder="Nombre del formador" className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Departamentos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DEPARTAMENTOS.map(dep => (
                    <Badge
                      key={dep}
                      variant={data.departamentos?.includes(dep) ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleDep(dep)}
                    >
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea value={data.descripcion} onChange={e => setData(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción breve del módulo..." rows={3} className="mt-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Normativa de Referencia</Label>
                  <Input value={data.normativaReferencia} onChange={e => setData(p => ({ ...p, normativaReferencia: e.target.value }))} placeholder="ISO 9001, GMP, etc." className="mt-1" />
                </div>
                <div>
                  <Label>Periodicidad de Renovación (meses)</Label>
                  <Input type="number" value={data.periodicidadMeses} onChange={e => setData(p => ({ ...p, periodicidadMeses: parseInt(e.target.value) || 0 }))} placeholder="0 = sin renovación" className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Objetivos de Aprendizaje</Label>
                <Textarea value={data.objetivos} onChange={e => setData(p => ({ ...p, objetivos: e.target.value }))} placeholder="¿Qué aprenderá el empleado con este módulo?" rows={4} className="mt-1" />
              </div>
            </TabsContent>

            {/* TAB: Contenido */}
            <TabsContent value="contenido" className="p-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-base font-semibold">Material de Estudio</Label>
                <div className="flex gap-2">
                  {data.generadoPorIA && <Badge className="bg-purple-100 text-purple-700 border-purple-200"><Sparkles className="w-3 h-3 mr-1" />Generado por IA</Badge>}
                  <Button variant="outline" size="sm" onClick={() => setPreviewContent(!previewContent)}>
                    {previewContent ? 'Editar' : 'Vista Previa'}
                  </Button>
                </div>
              </div>
              {previewContent ? (
                <div className="prose prose-sm max-w-none dark:prose-invert border rounded-lg p-4 min-h-[400px] bg-white dark:bg-card">
                  <ReactMarkdown>{data.contenido || '*Sin contenido aún. Usa el Asistente IA para generar el material de estudio.*'}</ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  value={data.contenido}
                  onChange={e => setData(p => ({ ...p, contenido: e.target.value }))}
                  placeholder="Escribe aquí el material de estudio, o usa el Asistente IA para generarlo automáticamente..."
                  rows={20}
                  className="font-mono text-sm"
                />
              )}
              <div className="mt-3">
                <Label>Bibliografía y Referencias</Label>
                <Textarea value={data.bibliografia} onChange={e => setData(p => ({ ...p, bibliografia: e.target.value }))} rows={3} className="mt-1" placeholder="Referencias bibliográficas y normativas consultadas..." />
              </div>
            </TabsContent>

            {/* TAB: Evaluación */}
            <TabsContent value="evaluacion" className="p-4">
              <Label className="text-base font-semibold">Preguntas de Evaluación</Label>
              <p className="text-sm text-slate-500 mb-3">Define las preguntas de evaluación y los criterios de superación del módulo.</p>
              <Textarea
                value={data.evaluacion}
                onChange={e => setData(p => ({ ...p, evaluacion: e.target.value }))}
                placeholder="Escribe las preguntas de evaluación, o solicita al Asistente IA que las genere..."
                rows={20}
                className="font-mono text-sm"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Panel IA */}
        {showAI && (
          <div className="w-96 border-l bg-slate-50 dark:bg-background flex flex-col">
            <TrainingAIChat module={data} onUpdateContent={handleAIContentUpdate} />
          </div>
        )}
      </div>
    </div>
  );
}