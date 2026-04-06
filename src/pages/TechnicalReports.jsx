import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Pencil, Trash2, Bot } from 'lucide-react';
import TechnicalReportEditor from '@/components/technical-reports/TechnicalReportEditor';
import TechnicalReportChat from '@/components/technical-reports/TechnicalReportChat';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_COLORS = {
  'Borrador': 'bg-gray-100 text-gray-700 border-gray-300',
  'En Revisión': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Pendiente': 'bg-orange-100 text-orange-700 border-orange-300',
  'Validado': 'bg-green-100 text-green-700 border-green-300',
  'Rechazado': 'bg-red-100 text-red-700 border-red-300',
};

export default function TechnicalReports() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['TechnicalReport'],
    queryFn: () => base44.entities.TechnicalReport.list('-created_date', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TechnicalReport.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['TechnicalReport'] }),
  });

  const filtered = reports.filter(r =>
    r.tituloInforme?.toLowerCase().includes(search.toLowerCase()) ||
    r.articulo?.toLowerCase().includes(search.toLowerCase()) ||
    r.autor?.toLowerCase().includes(search.toLowerCase()) ||
    r.numeroInforme?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = () => { setSelectedReport(null); setView('editor'); };
  const handleEdit = (report) => { setSelectedReport(report); setView('editor'); };
  const handleBack = () => {
    setView('list');
    setSelectedReport(null);
    queryClient.invalidateQueries({ queryKey: ['TechnicalReport'] });
  };

  if (view === 'editor') {
    return <TechnicalReportEditor report={selectedReport} onBack={handleBack} />;
  }

  return (
    <div className="h-full flex flex-col p-3 md:p-6 gap-4 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Informes Técnicos CQV</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">Gestión de informes de Comisionado, Cualificación y Validación</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowChat(!showChat)} className="gap-2 h-8" size="sm">
            <Bot className="w-4 h-4" /> Asistente IA
          </Button>
          <Button onClick={handleNew} className="gap-2 bg-blue-600 hover:bg-blue-700 h-8" size="sm">
            <Plus className="w-4 h-4" /> Nuevo Informe
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por título, artículo, autor o número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {['Borrador', 'En Revisión', 'Pendiente', 'Validado', 'Rechazado'].map(status => {
              const count = reports.filter(r => r.estadoInforme === status).length;
              return (
                <div key={status} className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-slate-800 dark:text-white">{count}</div>
                  <div className="text-xs text-slate-500 mt-1">{status}</div>
                </div>
              );
            })}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No hay informes aún</p>
              <p className="text-sm">Crea tu primer informe técnico</p>
              <Button onClick={handleNew} className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Nuevo Informe
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(report => (
                <div key={report.id} className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {report.numeroInforme && (
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {report.numeroInforme}
                          </span>
                        )}
                        <Badge className={`text-xs border ${STATUS_COLORS[report.estadoInforme] || 'bg-gray-100'}`}>
                          {report.estadoInforme}
                        </Badge>
                        {report.tipoInforme && (
                          <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                            {report.tipoInforme}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 dark:text-white truncate">{report.tituloInforme}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                        {report.articulo && <span>📦 {report.articulo}</span>}
                        {report.autor && <span>👤 {report.autor}</span>}
                        {report.fecha && <span>📅 {format(new Date(report.fecha), 'dd MMM yyyy', { locale: es })}</span>}
                        {report.hallazgos?.length > 0 && <span>⚠️ {report.hallazgos.length} hallazgo(s)</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(report)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => deleteMutation.mutate(report.id)}
                        title="Eliminar"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showChat && (
          <div className="w-80 flex-shrink-0">
            <TechnicalReportChat onClose={() => setShowChat(false)} />
          </div>
        )}
      </div>
    </div>
  );
}