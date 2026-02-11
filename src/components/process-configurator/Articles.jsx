import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
// import axios from "axios";
import { localDataService } from "./services/localDataService";
import { cdeApp } from "../../api/cdeAppClient";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Trash2,
  FileDown,
  Clock,
  Users,
  Package,
  RefreshCw,
  DownloadCloud,
  AlertTriangle,
  Building2
} from "lucide-react";

// const API = `${import.meta.env.VITE_BACKEND_URL || ''}/api`;

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filterNoProcess, setFilterNoProcess] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const data = await localDataService.getArticles();
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast.error("Error al cargar los artículos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (articleId, articleName) => {
    if (!window.confirm(`¿Eliminar el artículo "${articleName}"?`)) return;
    
    try {
      await localDataService.deleteArticle(articleId);
      toast.success("Artículo eliminado");
      fetchArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Error al eliminar el artículo");
    }
  };

  const handleExport = async (articleId, format, articleName) => {
    toast.info("La exportación no está disponible en modo local");
  };

  const handleSync = async () => {
    setUploading(true);
    try {
      // 1. Obtener artículos actuales para preservar asignaciones manuales
      const currentArticles = await localDataService.getArticles();
      const processMap = new Map();
      currentArticles.forEach(a => {
        if (a.code && a.process_code) {
          processMap.set(a.code.trim().toLowerCase(), a.process_code);
        }
      });

      toast.info("Iniciando sincronización con CDEApp...");
      const response = await cdeApp.syncArticles();
      
      let rows = [];
      
      // Normalizar respuesta (Array vs Headers/Data)
      if (response && response.headers && Array.isArray(response.headers)) {
          if (Array.isArray(response.data)) {
               rows = response.data.map(r => {
                   const obj = {};
                   response.headers.forEach((h, i) => obj[h] = r[i]);
                   return obj;
               });
          } else if (Array.isArray(response.rows)) { // Alternativa común
               rows = response.rows;
          }
      } else if (Array.isArray(response)) {
          rows = response;
      } else if (response && Array.isArray(response.data)) {
          rows = response.data;
      }

      console.log("Artículos recibidos:", rows);

      if (rows.length === 0) {
        toast.warning("No se recibieron artículos de la API");
        setUploading(false);
        return;
      }

      // Mapear a estructura interna
      const mappedArticles = rows.map(r => {
          const code = String(r.code || r.article_code || r.Codigo || r['Artículo'] || r.Articulo || '').trim();
          const name = String(r.name || r.article_name || r.Nombre || r['Descripción'] || r.Descripcion || '').trim();
          
          // Preservar proceso manual si existe
          const apiProcess = String(r.process_code || r.process || r.Proceso || '');
          const existingProcess = processMap.get(code.toLowerCase());
          const finalProcess = existingProcess || apiProcess;

          return {
              id: String(r.id || r.article_id || r.Id || r.ID || Math.random().toString(36).substr(2, 9)),
              code: code,
              name: name,
              client: String(r.client || r.client_name || r.Cliente || ''),
              process_code: finalProcess,
              reference: String(r.reference || r.Referencia || ''),
              type: String(r.type || r.Type || r.Tipo || r.Familia || r.Family || '').trim(),
              operators_required: parseInt(r.operators || r.Operarios || r.Personas || 1),
              total_time_seconds: parseFloat(r.total_time_seconds || r.Tiempo || 0)
          };
      }).filter(a => a.name || a.code);

      await localDataService.saveArticles(mappedArticles);
      setArticles(mappedArticles);
      
      // Calcular estadísticas
      const preservedCount = mappedArticles.filter(a => processMap.has(a.code.toLowerCase()) && a.process_code === processMap.get(a.code.toLowerCase())).length;
      
      toast.success(`${mappedArticles.length} artículos sincronizados. ${preservedCount} asignaciones de proceso preservadas.`);
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Error al sincronizar artículos: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0 seg";
    if (seconds < 60) return `${seconds.toFixed(1)} seg`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterNoProcess ? !article.process_code : true;
    
    return matchesSearch && matchesFilter;
  });

  const articlesWithoutProcess = articles.filter(a => !a.process_code).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="articles-loading">
        <div className="spinner h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="articles-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artículos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las configuraciones de artículos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild data-testid="new-article-btn">
            <Link to="/NewProcessConfigurator/configurator">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Artículo
            </Link>
          </Button>
        </div>
      </div>

      {/* Sync Section */}
      <Card data-testid="sync-card" className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
            <DownloadCloud className="h-5 w-5" />
            Sincronizar Artículos desde CDEApp
          </CardTitle>
          <CardDescription className="text-blue-600/80">
            Descarga la lista actualizada de artículos directamente desde el servidor central.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-blue-200 rounded-lg bg-white">
            <div className="p-3 bg-blue-100 rounded-full">
              <RefreshCw className={`h-6 w-6 text-blue-600 ${uploading ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-medium text-blue-900">Sincronización Cloud</h3>
              <p className="text-sm text-blue-600">
                Se actualizarán los códigos, nombres y clientes. Los procesos asignados manualmente se intentarán preservar si coinciden.
              </p>
            </div>
            <Button 
              onClick={handleSync} 
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
            >
              {uploading ? "Sincronizando..." : "Sincronizar Ahora"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warning for articles without process */}
      {articlesWithoutProcess > 0 && (
        <Card className="border-orange-200 bg-orange-50" data-testid="no-process-warning">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  {articlesWithoutProcess} artículo{articlesWithoutProcess !== 1 ? 's' : ''} sin proceso asignado
                </p>
                <p className="text-sm text-orange-600">
                  Haz clic en "Editar" para asignar un proceso o configurar actividades
                </p>
              </div>
              <Button
                variant={filterNoProcess ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterNoProcess(!filterNoProcess)}
                data-testid="filter-no-process-btn"
              >
                {filterNoProcess ? "Mostrar todos" : "Filtrar sin proceso"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, código o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-testid="search-input"
        />
      </div>

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <Card data-testid="empty-state">
          <CardContent className="py-16 text-center">
            <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            {articles.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No hay artículos</h3>
                <p className="text-muted-foreground mb-4">
                  Sincroniza artículos desde CDEApp o crea uno nuevo
                </p>
                <Button asChild>
                  <Link to="/NewProcessConfigurator/configurator">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Artículo
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
                <p className="text-muted-foreground">
                  No se encontraron artículos que coincidan con "{searchTerm}"
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="articles-table-card">
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredArticles.length} artículo{filteredArticles.length !== 1 ? 's' : ''}
              {filterNoProcess && " sin proceso"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead className="text-center">Tiempo</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => (
                    <TableRow 
                      key={article.id} 
                      className={`table-row-hover ${!article.process_code ? 'bg-orange-50/50' : ''}`}
                      data-testid={`article-row-${article.id}`}
                    >
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground">
                          {article.code || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Link 
                            to={`/NewProcessConfigurator/configurator/${article.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {article.name}
                          </Link>
                          {article.reference && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              Ref: {article.reference}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {article.client ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[150px]">{article.client}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {article.type ? (
                          <Badge variant="secondary" className="font-normal">
                            {article.type}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {article.process_code ? (
                          <Badge variant="default">{article.process_code}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Sin proceso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {formatTime(article.total_time_seconds)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`article-actions-${article.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/NewProcessConfigurator/configurator/${article.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                {article.process_code ? "Editar" : "Asignar Proceso"}
                              </Link>
                            </DropdownMenuItem>
                            {article.process_code && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleExport(article.id, 'excel', article.name)}
                                >
                                  <FileDown className="h-4 w-4 mr-2" />
                                  Exportar Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleExport(article.id, 'pdf', article.name)}
                                >
                                  <FileDown className="h-4 w-4 mr-2" />
                                  Exportar PDF
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDelete(article.id, article.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}