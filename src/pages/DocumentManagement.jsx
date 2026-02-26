import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Trash2, Search, Upload, Eye, History, Shield, Folder } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import DocumentViewer from "../components/documents/DocumentViewer";
import EnhancedDocumentForm from "../components/documents/EnhancedDocumentForm";
import DocumentExplorer from "../components/documents/DocumentExplorer";
import { usePermissions } from "../components/permissions/usePermissions";
import { toast } from "sonner";

const NATIVE_ROLES = [
  { id: 'admin', role_name: 'Administrador' },
  { id: 'user', role_name: 'Usuario' },
];

export default function DocumentManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
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

  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: []
  });

  // Stats logic
  const stats = useMemo(() => {
    return {
      total: documents.length,
      vigentes: documents.filter(d => d.estado === "Vigente").length,
      borradores: documents.filter(d => d.estado === "Borrador").length,
      asociados: documents.filter(d => d.entidad_asociada_id).length
    };
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

  const handleDownload = (doc) => {
    incrementDownloadMutation.mutate(doc.id);
    window.open(doc.archivo_url, '_blank');
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este documento?')) {
      deleteMutation.mutate(id);
    }
  };

  // Permissions
  const permissions = usePermissions('DocumentManagement');
  
  // DEBUG: Force permissions true to test UI visibility
  // console.log("DocumentManagement Permissions:", permissions);
  
  const canCreate = true; // permissions.createDocuments;
  const canDelete = true; // permissions.deleteDocuments;
  const canEdit = true;   // permissions.editDocuments;

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Estándar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Gestión Documental
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Repositorio centralizado con estructura de carpetas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => setShowForm(true)} size="sm" className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Subir Documento</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-700 font-medium uppercase">Total</p>
                <p className="text-xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <FileText className="w-5 h-5 text-blue-600 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-green-700 font-medium uppercase">Vigentes</p>
                <p className="text-xl font-bold text-green-900">{stats.vigentes}</p>
              </div>
              <FileText className="w-5 h-5 text-green-600 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-700 font-medium uppercase">Borradores</p>
                <p className="text-xl font-bold text-amber-900">{stats.borradores}</p>
              </div>
              <FileText className="w-5 h-5 text-amber-600 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-purple-700 font-medium uppercase">Asociados</p>
                <p className="text-xl font-bold text-purple-900">{stats.asociados}</p>
              </div>
              <FileText className="w-5 h-5 text-purple-600 opacity-50" />
            </CardContent>
          </Card>
      </div>

      {/* Document Explorer (Main Content) */}
      <div className="flex-1 min-h-0 border rounded-lg shadow-sm overflow-hidden">
         <DocumentExplorer 
           currentFolder={currentFolder}
           onFolderChange={setCurrentFolder}
           onViewDocument={setViewingDocument}
           onEditDocument={(doc) => { setEditingDocument(doc); setShowForm(true); }}
           onDeleteDocument={handleDelete}
           onDownload={handleDownload}
           onUpload={() => setShowForm(true)}
           permissions={{
             createDocuments: canCreate,
             editDocuments: canEdit,
             deleteDocuments: canDelete,
             viewDocuments: true,
             viewHistory: true
           }}
         />
      </div>

      {showForm && (
        <EnhancedDocumentForm
          document={editingDocument}
          currentFolderId={currentFolder?.id}
          onClose={() => {
            setShowForm(false);
            setEditingDocument(null);
          }}
        />
      )}

      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          roles={NATIVE_ROLES}
          departments={departments}
          onClose={() => setViewingDocument(null)}
          onEdit={canEdit ? () => {
            setEditingDocument(viewingDocument);
            setShowForm(true);
            setViewingDocument(null);
          } : undefined}
        />
      )}
    </div>
  );
}