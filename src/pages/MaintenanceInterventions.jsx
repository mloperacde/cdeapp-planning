import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppData } from "@/components/data/DataProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Wrench, Clock, CheckCircle2, AlertCircle,
  ArrowUpCircle, Filter, X, ChevronRight, MapPin, Users, Calendar
} from "lucide-react";
import InterventionForm from "@/components/maintenance/InterventionForm";
import InterventionDetail from "@/components/maintenance/InterventionDetail";

const STATUS_CONFIG = {
  "Pendiente": { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock, dot: "bg-yellow-400" },
  "En Progreso": { color: "bg-blue-100 text-blue-800 border-blue-200", icon: ArrowUpCircle, dot: "bg-blue-500" },
  "En Revisión": { color: "bg-purple-100 text-purple-800 border-purple-200", icon: AlertCircle, dot: "bg-purple-500" },
  "Completada": { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2, dot: "bg-green-500" },
  "Cancelada": { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle, dot: "bg-red-400" },
};

const PRIORIDAD_CONFIG = {
  "Baja": "bg-green-100 text-green-700",
  "Media": "bg-yellow-100 text-yellow-700",
  "Alta": "bg-orange-100 text-orange-700",
  "Crítica": "bg-red-100 text-red-700 font-bold"
};

export default function MaintenanceInterventions() {
  const { user } = useAppData();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [prioridadFilter, setPrioridadFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [view, setView] = useState("grid"); // grid | list
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editIntervention, setEditIntervention] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceIntervention.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceInterventions'] });
    },
  });

  const { data: interventions = [], isLoading, refetch } = useQuery({
    queryKey: ['maintenanceInterventions'],
    queryFn: () => base44.entities.MaintenanceIntervention.list('-created_date', 200),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = interventions.filter(i => {
    const matchSearch = !search || 
      i.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      i.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
      i.solicitante_nombre?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = estadoFilter === "all" || i.estado === estadoFilter;
    const matchPrioridad = prioridadFilter === "all" || i.prioridad === prioridadFilter;
    const matchTipo = tipoFilter === "all" || i.tipo === tipoFilter;
    return matchSearch && matchEstado && matchPrioridad && matchTipo;
  });

  const stats = {
    total: interventions.length,
    pendiente: interventions.filter(i => i.estado === "Pendiente").length,
    enProgreso: interventions.filter(i => i.estado === "En Progreso").length,
    criticas: interventions.filter(i => i.prioridad === "Crítica" && i.estado !== "Completada").length,
    completadas: interventions.filter(i => i.estado === "Completada").length,
  };

  const handleSave = (saved) => {
    refetch();
    setShowForm(false);
    setEditIntervention(null);
    if (!selectedIntervention) {
      setSelectedIntervention(saved);
      setIsDetailOpen(true);
    }
  };

  const handleEdit = () => {
    setEditIntervention(selectedIntervention);
    setIsDetailOpen(false);
    setShowForm(true);
  };

  const handleDelete = (intervention) => {
    if (!intervention?.id) return;
    if (!window.confirm("¿Eliminar esta intervención? Esta acción no se puede deshacer.")) return;
    deleteMutation.mutate(intervention.id, {
      onSuccess: () => {
        if (isDetailOpen) setIsDetailOpen(false);
      }
    });
  };

  const handleOpenDetail = (intervention) => {
    setSelectedIntervention(intervention);
    setIsDetailOpen(true);
    setShowForm(false);
  };

  const hasFilters = estadoFilter !== "all" || prioridadFilter !== "all" || tipoFilter !== "all" || search;

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Gestión de Intervenciones
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Acciones, mejoras, incidencias y órdenes de trabajo de mantenimiento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setEditIntervention(null); setShowForm(true); setIsDetailOpen(false); }}
            size="sm"
            className="h-8 gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Intervención</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-slate-700", bg: "bg-slate-50", dot: "bg-slate-400" },
          { label: "Pendientes", value: stats.pendiente, color: "text-yellow-700", bg: "bg-yellow-50", dot: "bg-yellow-400" },
          { label: "En Progreso", value: stats.enProgreso, color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
          { label: "Críticas", value: stats.criticas, color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
          { label: "Completadas", value: stats.completadas, color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
        ].map(s => (
          <Card key={s.label} className={`${s.bg} border-0 cursor-pointer hover:shadow-md transition-shadow`} onClick={() => setEstadoFilter(s.label === "Total" ? "all" : s.label === "Críticas" ? "all" : s.label === "Completadas" ? "Completada" : s.label === "Pendientes" ? "Pendiente" : "En Progreso")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s.dot}`} />
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar intervenciones..." className="pl-9" />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {["Pendiente", "En Progreso", "En Revisión", "Completada", "Cancelada"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={prioridadFilter} onValueChange={setPrioridadFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {["Baja", "Media", "Alta", "Crítica"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {["Acción", "Modificación", "Mejora", "Resolución de Incidencia", "Mejora de Instalación", "Mejora de Máquina", "Otro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setEstadoFilter("all"); setPrioridadFilter("all"); setTipoFilter("all"); }}>
            <X className="w-4 h-4 mr-1" /> Limpiar
          </Button>
        )}
        <span className="text-sm text-slate-500 ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-500">Cargando intervenciones...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">
            {hasFilters ? "Sin resultados" : "Sin intervenciones"}
          </h3>
          <p className="text-slate-400 mb-4">
            {hasFilters ? "Prueba con otros filtros" : "Crea la primera intervención de mantenimiento"}
          </p>
          {!hasFilters && (
            <Button onClick={() => { setEditIntervention(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nueva Intervención
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(intervention => {
            const sc = STATUS_CONFIG[intervention.estado] || STATUS_CONFIG["Pendiente"];
            const Icon = sc.icon;
            const latestProgress = intervention.progreso?.slice(-1)[0];
            const porcentaje = latestProgress?.porcentaje || 0;

            return (
              <Card
                key={intervention.id}
                className="hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-slate-200"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleOpenDetail(intervention)}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge className={`${sc.color} border flex items-center gap-1 text-xs`}>
                          <Icon className="w-3 h-3" />{intervention.estado}
                        </Badge>
                        <Badge className={`${PRIORIDAD_CONFIG[intervention.prioridad]} text-xs`}>{intervention.prioridad}</Badge>
                        {intervention.imagenes_adjuntas?.length > 0 && (
                          <span className="text-xs text-slate-400">📷 {intervention.imagenes_adjuntas.length}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">{intervention.titulo}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(intervention)}
                      >
                        Eliminar
                      </button>
                      <ChevronRight
                        className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1 cursor-pointer"
                        onClick={() => handleOpenDetail(intervention)}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">{intervention.descripcion}</p>

                  {/* Progress bar */}
                  {porcentaje > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Progreso</span>
                        <span>{porcentaje}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${porcentaje}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      {intervention.objetivo_tipo && intervention.objetivo_tipo !== "Personalizado" && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{intervention.objetivo_tipo}</span>
                      )}
                      {intervention.objetivo_tipo === "Máquina" && intervention.objetivo_maquina_nombre && (
                        <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{intervention.objetivo_maquina_nombre}</span>
                      )}
                      {intervention.objetivo_tipo === "Área" && intervention.objetivo_area && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{intervention.objetivo_area}</span>
                      )}
                      {intervention.objetivo_tipo === "Sala" && intervention.objetivo_sala && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{intervention.objetivo_sala}</span>
                      )}
                      {intervention.objetivo_tipo === "Personalizado" && intervention.objetivo_descripcion_manual && (
                        <span className="truncate max-w-[200px]">{intervention.objetivo_descripcion_manual}</span>
                      )}
                      {intervention.destinatarios?.length > 0 && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{intervention.destinatarios.length}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {intervention.fecha_solicitud
                        ? new Date(intervention.fecha_solicitud).toLocaleDateString('es-ES')
                        : new Date(intervention.created_date).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* DETAIL SHEET */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" /> Detalle de Intervención
            </SheetTitle>
          </SheetHeader>
          {selectedIntervention && (
            <InterventionDetail
              intervention={selectedIntervention}
              onEdit={handleEdit}
              onRefresh={() => {
                refetch().then(() => {
                  // Refresh selected intervention from new data
                  queryClient.invalidateQueries(['maintenanceInterventions']);
                });
                // Reload selected
                base44.entities.MaintenanceIntervention.filter({ id: selectedIntervention.id }).then(res => {
                  if (res?.[0]) setSelectedIntervention(res[0]);
                }).catch(() => refetch());
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* FORM DIALOG */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditIntervention(null); } }}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader className="mb-2">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              {editIntervention ? "Editar Intervención" : "Nueva Intervención"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configura los datos principales de la intervención de mantenimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <InterventionForm
              intervention={editIntervention}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditIntervention(null); }}
            />
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
