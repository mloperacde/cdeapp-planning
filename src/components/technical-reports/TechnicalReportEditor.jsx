import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Save, Printer, Bot } from 'lucide-react';
import ReportGeneralInfo from './ReportGeneralInfo';
import ReportFindings from './ReportFindings';
import ReportEvidences from './ReportEvidences';
import ReportTextSections from './ReportTextSections';
import ReportPrintView from './ReportPrintView';
import TechnicalReportChat from './TechnicalReportChat';

const INITIAL_REPORT = {
  tituloInforme: '',
  estadoInforme: 'Borrador',
  tipoInforme: '',
  articulo: '',
  productId: '',
  sala: '',
  linea: '',
  lote: '',
  fecha: new Date().toISOString().split('T')[0],
  fechaInicio: '',
  fechaFin: '',
  autor: '',
  departamento: '',
  aprobadorQA: '',
  objetivo: '',
  alcance: '',
  resumenEjecutivo: '',
  metodologia: '',
  hallazgos: [],
  evidencias: [],
  conclusiones: '',
  recomendaciones: '',
  firmaAutor: false,
  firmaQA: false,
  numeroInforme: '',
};

export default function TechnicalReportEditor({ report, onBack }) {
  const [data, setData] = useState(report || INITIAL_REPORT);
  const [showPrint, setShowPrint] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [saved, setSaved] = useState(false);

  const isEditing = !!report?.id;

  const saveMutation = useMutation({
    mutationFn: (d) =>
      isEditing
        ? base44.entities.TechnicalReport.update(report.id, d)
        : base44.entities.TechnicalReport.create(d),
    onSuccess: (result) => {
      setSaved(true);
      if (!isEditing) {
        setData(prev => ({ ...prev, id: result.id }));
      }
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const update = (fields) => setData(prev => ({ ...prev, ...fields }));

  if (showPrint) {
    return <ReportPrintView data={data} onBack={() => setShowPrint(false)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-border bg-white dark:bg-card flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 dark:text-white truncate">
              {data.tituloInforme || 'Nuevo Informe Técnico'}
            </h2>
            <p className="text-xs text-slate-400">{isEditing ? 'Editando informe' : 'Nuevo informe'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)} className="gap-1">
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">IA</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPrint(true)} className="gap-1">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(data)}
            disabled={saveMutation.isPending}
            className={`gap-1 ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="general" className="h-full">
            <div className="sticky top-0 bg-white dark:bg-card z-10 border-b border-slate-200 dark:border-border px-4">
              <TabsList className="h-10 my-2">
                <TabsTrigger value="general" className="text-xs">Información</TabsTrigger>
                <TabsTrigger value="texto" className="text-xs">Contenido</TabsTrigger>
                <TabsTrigger value="hallazgos" className="text-xs">
                  Hallazgos {data.hallazgos?.length > 0 && `(${data.hallazgos.length})`}
                </TabsTrigger>
                <TabsTrigger value="evidencias" className="text-xs">
                  Evidencias {data.evidencias?.length > 0 && `(${data.evidencias.length})`}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              <TabsContent value="general">
                <ReportGeneralInfo data={data} onChange={update} />
              </TabsContent>
              <TabsContent value="texto">
                <ReportTextSections data={data} onChange={update} />
              </TabsContent>
              <TabsContent value="hallazgos">
                <ReportFindings data={data} onChange={update} />
              </TabsContent>
              <TabsContent value="evidencias">
                <ReportEvidences data={data} onChange={update} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-72 border-l border-slate-200 dark:border-border flex-shrink-0">
            <TechnicalReportChat reportData={data} onClose={() => setShowChat(false)} onUpdateReport={update} />
          </div>
        )}
      </div>
    </div>
  );
}