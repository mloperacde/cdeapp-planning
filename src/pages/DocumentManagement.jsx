import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Trash2, Search, Upload, Eye, History, Shield, Folder, List, LayoutGrid } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import DocumentViewer from "../components/documents/DocumentViewer";
import EnhancedDocumentForm from "../components/documents/EnhancedDocumentForm";
import DocumentExplorer from "../components/documents/DocumentExplorer";
import { usePermissions } from "../components/permissions/usePermissions";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const NATIVE_ROLES = [
  { id: 'admin', role_name: 'Administrador' },
  { id: 'user', role_name: 'Usuario' },
];

export default function DocumentManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [viewMode, setViewMode] = useState("explorer"); // 'explorer' | 'database'
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    const term = searchTerm.toLowerCase();
    return documents.filter(d => 
      d.titulo?.toLowerCase().includes(term) ||
      d.categoria?.toLowerCase().includes(term) ||
      d.tipo_entidad_asociada?.toLowerCase().includes(term)
    );
  }, [documents, searchTerm]);

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
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-md border border-slate-200 mr-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-6 px-2 text-xs ${viewMode === 'explorer' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              onClick={() => setViewMode('explorer')}
            >
              <LayoutGrid className="w-3 h-3 mr-1" />
              Carpetas
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-6 px-2 text-xs ${viewMode === 'database' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              onClick={() => setViewMode('database')}
            >
              <List className="w-3 h-3 mr-1" />
              Base de Datos
            </Button>
          </div>

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

      {/* Main Content */}
      <div className="flex-1 min-h-0 border rounded-lg shadow-sm overflow-hidden bg-white">
         {viewMode === 'explorer' ? (
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
         ) : (
           <div className="flex flex-col h-full">
             <div className="p-4 border-b flex items-center gap-4 bg-slate-50/50">
               <div className="relative flex-1 max-w-sm">
                 <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                 <Input 
                   placeholder="Buscar en todos los documentos..." 
                   className="pl-9 h-9"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
               <div className="text-xs text-slate-500 ml-auto">
                 Mostrando {filteredDocuments.length} de {documents.length} registros
               </div>
             </div>
             
             <div className="flex-1 overflow-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[300px]">Documento</TableHead>
                     <TableHead>Categoría</TableHead>
                     <TableHead>Estado</TableHead>
                     <TableHead>Versión</TableHead>
                     <TableHead>Fecha Creación</TableHead>
                     <TableHead className="text-right">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredDocuments.length > 0 ? (
                     filteredDocuments.map((doc) => (
                       <TableRow key={doc.id} className="group">
                         <TableCell>
                           <div className="flex items-center gap-3">
                             <div className="p-2 bg-slate-100 rounded text-slate-500">
                               <FileText className="w-4 h-4" />
                             </div>
                             <div>
                               <div className="font-medium text-slate-900">{doc.titulo}</div>
                               <div className="text-xs text-slate-500">{doc.tipo_archivo?.toUpperCase() || 'FILE'} • {(doc.tamano_bytes / 1024).toFixed(1)} KB</div>
                             </div>
                           </div>
                         </TableCell>
                         <TableCell>
                           <Badge variant="outline" className="font-normal">
                             {doc.categoria || 'General'}
                           </Badge>
                         </TableCell>
                         <TableCell>
                           <Badge className={
                             doc.estado === 'Vigente' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 
                             doc.estado === 'Obsoleto' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                             'bg-slate-100 text-slate-700 hover:bg-slate-100'
                           }>
                             {doc.estado || 'Borrador'}
                           </Badge>
                         </TableCell>
                         <TableCell>
                           <span className="font-mono text-xs">v{doc.version || '1.0'}</span>
                         </TableCell>
                         <TableCell className="text-xs text-slate-500">
                           {format(new Date(doc.created_date || doc.fecha_creacion), "dd/MM/yyyy HH:mm", { locale: es })}
                         </TableCell>
                         <TableCell className="text-right">
                           <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)} title="Descargar">
                               <Download className="w-4 h-4 text-slate-500" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingDocument(doc)} title="Ver detalles">
                               <Eye className="w-4 h-4 text-blue-500" />
                             </Button>
                             {canDelete && (
                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(doc.id)} title="Eliminar">
                                 <Trash2 className="w-4 h-4 text-red-500" />
                               </Button>
                             )}
                           </div>
                         </TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow>
                       <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                         No se encontraron documentos
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
           </div>
         )}
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