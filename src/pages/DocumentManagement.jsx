import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Trash2, Search, Upload, Eye, History, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Breadcrumbs from "../components/common/Breadcrumbs";
import { useNavigationHistory } from "../components/utils/useNavigationHistory";
import DocumentViewer from "../components/documents/DocumentViewer";
import EnhancedDocumentForm from "../components/documents/EnhancedDocumentForm";
import AdvancedDocumentSearch from "../components/documents/AdvancedDocumentSearch";
import { toast } from "sonner";

export default function DocumentManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({});
  const queryClient = useQueryClient();

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-fecha_creacion'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return (Array.isArray(data) ? data : [])
        .map(m => ({
          id: m.id,
          nombre: m.nombre || '',
          codigo: m.codigo_maquina || m.codigo || '',
          orden: m.orden_visualizacion || 999
        }))
        .sort((a, b) => (a.orden || 999) - (b.orden || 999));
    },
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: roles } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    initialData: [],
  });

  const { goBack } = useNavigationHistory();

  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: []
  });

  const categories = useMemo(() => {
    return [...new Set(documents.map(d => d.categoria).filter(Boolean))].sort();
  }, [documents]);

  const departments = useMemo(() => {
    return [...new Set(masterEmployees.map(e => e.departamento).filter(Boolean))].sort();
  }, [masterEmployees]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Documento eliminado");
    },
  });

  const incrementDownloadMutation = useMutation({
    mutationFn: async (docId) => {
      const doc = documents.find(d => d.id === docId);
      if (!doc) return;
      
      return base44.entities.Document.update(docId, {
        contador_descargas: (doc.contador_descargas || 0) + 1,
        ultima_descarga: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !advancedFilters.searchTerm || 
        doc.titulo?.toLowerCase().includes(advancedFilters.searchTerm.toLowerCase()) ||
        doc.descripcion?.toLowerCase().includes(advancedFilters.searchTerm.toLowerCase());
      
      const matchesFullText = !advancedFilters.fullTextSearch ||
        doc.contenido_indexado?.toLowerCase().includes(advancedFilters.fullTextSearch.toLowerCase());
      
      const matchesCategory = !advancedFilters.category || doc.categoria === advancedFilters.category;
      
      const matchesDepartment = !advancedFilters.department || 
        doc.departamentos_acceso?.includes(advancedFilters.department) ||
        (doc.departamentos_acceso?.length === 0);
      
      const matchesRole = !advancedFilters.role || 
        doc.roles_acceso?.includes(advancedFilters.role);
      
      const matchesTags = !advancedFilters.tags || advancedFilters.tags.length === 0 ||
        advancedFilters.tags.some(tag => doc.etiquetas?.includes(tag));
      
      return matchesSearch && matchesFullText && matchesCategory && matchesDepartment && matchesRole && matchesTags;
    });
  }, [documents, advancedFilters]);

  const documentsByCategory = useMemo(() => {
    const grouped = {};
    filteredDocuments.forEach(doc => {
      const cat = doc.categoria || "Otro";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(doc);
    });
    return grouped;
  }, [filteredDocuments]);

  const stats = useMemo(() => {
    return {
      total: documents.length,
      vigentes: documents.filter(d => d.estado === "Vigente").length,
      borradores: documents.filter(d => d.estado === "Borrador").length,
      asociados: documents.filter(d => d.entidad_asociada_id).length
    };
  }, [documents]);

  const handleDownload = (doc) => {
    incrementDownloadMutation.mutate(doc.id);
    window.open(doc.archivo_url, '_blank');
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este documento?')) {
      deleteMutation.mutate(id);
    }
  };

  const getEstadoBadge = (estado) => {
    const config = {
      "Borrador": "bg-amber-100 text-amber-800",
      "Vigente": "bg-green-100 text-green-800",
      "Obsoleto": "bg-slate-100 text-slate-800",
      "Archivado": "bg-slate-200 text-slate-600"
    }[estado] || "bg-slate-100 text-slate-800";

    return <Badge className={config}>{estado}</Badge>;
  };

  const getEntityName = (doc) => {
    if (!doc.entidad_asociada_id) return null;
    
    if (doc.tipo_entidad_asociada === "Machine") {
      const machine = machines.find(m => m.id === doc.entidad_asociada_id);
      return machine?.nombre;
    }
    if (doc.tipo_entidad_asociada === "Employee") {
      const employee = employees.find(e => e.id === doc.entidad_asociada_id);
      return employee?.nombre;
    }
    return null;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs showBack={true} onBack={goBack} />
        

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Gestión Documental
            </h1>
            <p className="text-slate-600 mt-1">
              Repositorio centralizado con control de versiones y permisos
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Subir Documento
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Documentos</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Vigentes</p>
                  <p className="text-2xl font-bold text-green-900">{stats.vigentes}</p>
                </div>
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Borradores</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.borradores}</p>
                </div>
                <FileText className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Asociados</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.asociados}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Búsqueda Avanzada
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <AdvancedDocumentSearch
              onSearchChange={setAdvancedFilters}
              categories={categories}
              departments={departments}
              roles={roles}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {Object.entries(documentsByCategory).map(([categoria, docs]) => (
            <Card key={categoria} className="shadow-lg">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {categoria} ({docs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {docs.map((doc) => {
                    const entityName = getEntityName(doc);
                    return (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-slate-900">{doc.titulo}</h3>
                              {getEstadoBadge(doc.estado)}
                              {doc.version && (
                                <Badge variant="outline" className="text-xs">
                                  v{doc.version}
                                </Badge>
                              )}
                              {doc.roles_acceso?.length > 0 && (
                                <Badge className="bg-purple-100 text-purple-800 text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Restringido
                                </Badge>
                              )}
                            </div>
                            
                            {doc.descripcion && (
                              <p className="text-sm text-slate-600 mb-2">{doc.descripcion}</p>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {entityName && (
                                <Badge variant="outline" className="text-xs">
                                  {doc.tipo_entidad_asociada}: {entityName}
                                </Badge>
                              )}
                              {doc.etiquetas?.map((tag, idx) => (
                                <Badge key={idx} className="bg-blue-100 text-blue-700 text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="flex gap-4 mt-2 text-xs text-slate-500">
                              <span>📅 {format(new Date(doc.fecha_creacion || doc.created_date), "dd/MM/yyyy", { locale: es })}</span>
                              {doc.contador_descargas > 0 && (
                                <span>📥 {doc.contador_descargas} descargas</span>
                              )}
                              {doc.historial_versiones?.length > 0 && (
                                <span>📝 {doc.historial_versiones.length + 1} versiones</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingDocument(doc)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {doc.historial_versiones?.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingDocument(doc)}
                                title="Ver historial"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(doc.id)}
                              className="hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredDocuments.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Upload className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No hay documentos que coincidan con los filtros</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showForm && (
        <EnhancedDocumentForm
          document={editingDocument}
          onClose={() => {
            setShowForm(false);
            setEditingDocument(null);
          }}
        />
      )}

      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
          onEdit={() => {
            setEditingDocument(viewingDocument);
            setShowForm(true);
            setViewingDocument(null);
          }}
        />
      )}
    </div>
  );
}
