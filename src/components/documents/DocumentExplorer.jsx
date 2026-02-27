import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Folder, FileText, ChevronRight, Upload, Plus, 
  MoreVertical, Trash2, Edit, Download, CornerLeftUp, 
  FolderPlus, Home, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge"; // Added missing import
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DocumentExplorer({ 
  onViewDocument, 
  onEditDocument, 
  onDeleteDocument, 
  permissions,
  onUpload,
  currentFolder,
  onFolderChange,
  onDownload
}) {
  const [folderPath, setFolderPath] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const queryClient = useQueryClient();

  // --- QUERIES ---

  // Helper to fetch folders from AppConfig (Virtual Folders)
  const fetchFolders = async () => {
    try {
      const config = await base44.entities.AppConfig.filter({ config_key: "document_folders_structure" });
      if (config.length > 0) {
        // Try all fields (Triple Read)
        const candidates = [
          config[0].value,
          config[0].description,
          config[0].app_subtitle
        ];

        for (const raw of candidates) {
          if (raw && typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) return parsed;
            } catch (e) {
              // Continue to next candidate
            }
          }
        }
      }
      return [];
    } catch (e) {
      console.warn("Error fetching virtual folders:", e);
      return [];
    }
  };

  // Helper to save folders to AppConfig
  const saveFolders = async (newFolders) => {
    const jsonVal = JSON.stringify(newFolders);
    const APP_KEY = "document_folders_structure";
    
    const existing = await base44.entities.AppConfig.filter({ config_key: APP_KEY });
    
    // Triple Write Strategy (Value + Description + Subtitle)
    const payload = {
      config_key: APP_KEY,
      value: jsonVal,
      description: jsonVal,
      app_subtitle: jsonVal 
    };

    if (existing.length > 0) {
      await base44.entities.AppConfig.update(existing[0].id, payload);
    } else {
      await base44.entities.AppConfig.create(payload);
    }
  };

  // Fetch Folders (Virtual)
  const { data: allFolders = [], isLoading: isLoadingFolders, refetch: refetchFolders } = useQuery({
    queryKey: ['documentFolders'],
    queryFn: fetchFolders,
    initialData: []
  });

  const folders = allFolders.filter(f => (f.parent_folder_id || null) === (currentFolder?.id || null));

  // Fetch Documents
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['documents', currentFolder?.id],
    queryFn: async () => {
      const allDocs = await base44.entities.Document.list();
      const targetId = currentFolder?.id || null;
      return allDocs.filter(d => (d.folder_id || null) === targetId);
    },
    initialData: []
  });

  // --- MUTATIONS ---

  const createFolderMutation = useMutation({
    mutationFn: async (name) => {
      const newFolder = {
        id: `folder_${Date.now()}`,
        nombre: name,
        parent_folder_id: currentFolder?.id || null,
        created_at: new Date().toISOString()
      };
      
      const updatedFolders = [...allFolders, newFolder];
      await saveFolders(updatedFolders);
      return newFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentFolders'] }); // This will trigger refetch of 'documentFolders'
      // We also need to refetch the local query if key matches, but here we use a global key 'documentFolders'
      // and filter locally. So invalidating 'documentFolders' is enough.
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      toast.success("Carpeta creada");
    },
    onError: (e) => toast.error("Error al crear carpeta: " + e.message)
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      return base44.entities.Document.create({
        titulo: file.name,
        archivo_url: uploadResult.file_url,
        folder_id: currentFolder?.id || null,
        tipo_archivo: file.type,
        tamano_bytes: file.size,
        estado: "Vigente",
        version: "1.0",
        created_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Archivo subido correctamente");
    },
    onError: (e) => toast.error("Error al subir archivo: " + e.message)
  });

  // --- HANDLERS ---

  const handleNavigate = (folder) => {
    setFolderPath(prev => [...prev, folder]);
    onFolderChange(folder);
    setSearchTerm("");
  };

  const handleNavigateUp = () => {
    if (folderPath.length === 0) return;
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    onFolderChange(newPath.length > 0 ? newPath[newPath.length - 1] : null);
  };

  const handleNavigateBreadcrumb = (index) => {
    if (index === -1) {
      setFolderPath([]);
      onFolderChange(null);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      onFolderChange(newPath[newPath.length - 1]);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(newFolderName);
  };

  // Drag & Drop (React Dropzone)
  const onDrop = useCallback((acceptedFiles) => {
    if (!permissions.createDocuments) {
      toast.error("No tienes permisos para subir documentos");
      return;
    }
    acceptedFiles.forEach(file => {
      uploadFileMutation.mutate(file);
    });
  }, [permissions.createDocuments, uploadFileMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    noClick: true, // Disable click to open dialog (we use a specific button for that)
    noKeyboard: true
  });

  // Paste Handler
  useEffect(() => {
    const handlePaste = (e) => {
      if (!permissions.createDocuments) return;
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        Array.from(e.clipboardData.files).forEach(file => {
          uploadFileMutation.mutate(file);
        });
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [permissions.createDocuments, uploadFileMutation]);


  // Filtering
  const filteredFolders = folders.filter(f => 
    f.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredDocs = documents.filter(d => 
    d.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div {...getRootProps()} className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border shadow-sm outline-none">
      <input {...getInputProps()} />
      
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 overflow-hidden">
            <Button variant="ghost" size="sm" onClick={() => handleNavigateBreadcrumb(-1)}>
                <Home className="w-4 h-4" />
            </Button>
            {folderPath.length > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
            
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {folderPath.map((folder, idx) => (
                    <React.Fragment key={folder.id}>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="whitespace-nowrap"
                            onClick={() => handleNavigateBreadcrumb(idx)}
                        >
                            {folder.nombre}
                        </Button>
                        {idx < folderPath.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </React.Fragment>
                ))}
            </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <Input 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-48 h-9"
                />
            </div>
            
            {permissions.createDocuments && (
                <>
                    <Button variant="outline" size="sm" onClick={() => setIsCreateFolderOpen(true)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Nueva Carpeta</span>
                    </Button>
                    <Button size="sm" onClick={onUpload} className="bg-blue-600 hover:bg-blue-700">
                        <Upload className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Subir</span>
                    </Button>
                </>
            )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {isDragActive && (
            <div className="absolute inset-0 bg-blue-50/90 dark:bg-blue-900/50 z-50 flex items-center justify-center border-4 border-dashed border-blue-400 rounded-lg m-2">
                <div className="text-center">
                    <Upload className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold text-blue-700">Suelta los archivos aquí</h3>
                </div>
            </div>
        )}

        {/* Empty State */}
        {!isLoadingFolders && !isLoadingDocs && filteredFolders.length === 0 && filteredDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Folder className="w-16 h-16 mb-4 opacity-20" />
                <p>Carpeta vacía</p>
                <p className="text-xs mt-2">Arrastra archivos o usa el botón Subir</p>
            </div>
        )}

        {/* Folders Grid */}
        {filteredFolders.length > 0 && (
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Carpetas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredFolders.map(folder => (
                        <div 
                            key={folder.id}
                            onClick={() => handleNavigate(folder)}
                            className="group flex flex-col items-center p-4 rounded-xl border border-slate-100 bg-white hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all shadow-sm"
                        >
                            <Folder className="w-12 h-12 text-blue-400 group-hover:text-blue-500 mb-2 fill-blue-50" />
                            <span className="text-sm font-medium text-slate-700 text-center truncate w-full group-hover:text-blue-700">
                                {folder.nombre}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Files Grid */}
        {filteredDocs.length > 0 && (
            <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Archivos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredDocs.map(doc => (
                        <div 
                            key={doc.id}
                            className="group relative flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-all"
                        >
                            <div className="p-2 rounded bg-slate-100 group-hover:bg-white transition-colors">
                                <FileText className="w-6 h-6 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-slate-900 truncate" title={doc.titulo}>
                                    {doc.titulo}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-slate-500">
                                        {format(new Date(doc.created_date || doc.fecha_creacion), "dd/MM/yyyy", { locale: es })}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                        {doc.version || '1.0'}
                                    </Badge>
                                </div>
                            </div>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onViewDocument(doc)}>
                                        <Eye className="w-4 h-4 mr-2" /> Ver
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDownload(doc)}>
                                        <Download className="w-4 h-4 mr-2" /> Descargar
                                    </DropdownMenuItem>
                                    {permissions.editDocuments && (
                                        <DropdownMenuItem onClick={() => onEditDocument(doc)}>
                                            <Edit className="w-4 h-4 mr-2" /> Editar
                                        </DropdownMenuItem>
                                    )}
                                    {permissions.deleteDocuments && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => onDeleteDocument(doc.id)} className="text-red-600">
                                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Nueva Carpeta</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label>Nombre de la carpeta</Label>
                <Input 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Ej. Procedimientos"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateFolder}>Crear</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}