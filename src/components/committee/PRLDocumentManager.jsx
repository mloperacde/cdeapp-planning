
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Download, Trash2, AlertTriangle, Upload, Filter, Search, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import PRLDocumentForm from "./PRLDocumentForm";

export default function PRLDocumentManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [filters, setFilters] = useState({
    tipo_documento: "all",
    estado: "all",
    searchTerm: ""
  });
  const queryClient = useQueryClient();

  const { data: documents } = useQuery({
    queryKey: ['prlDocuments'],
    queryFn: () => base44.entities.PRLDocument.list('-fecha_subida'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PRLDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prlDocuments'] });
      toast.success("Documento eliminado");
    },
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesTipo = filters.tipo_documento === "all" || doc.tipo_documento === filters.tipo_documento;
      const matchesEstado = filters.estado === "all" || doc.estado === filters.estado;
      const matchesSearch = !filters.searchTerm || 
        doc.titulo?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        doc.descripcion?.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      return matchesTipo && matchesEstado && matchesSearch;
    });
  }, [documents, filters]);

  const documentsByType = useMemo(() => {
    const grouped = {};
    filteredDocuments.forEach(doc => {
      const tipo = doc.tipo_documento || "Otro";
      if (!grouped[tipo]) {
        grouped[tipo] = [];
      }
      grouped[tipo].push(doc);
    });
    return grouped;
  }, [filteredDocuments]);

  const documentosProximosCaducar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day for accurate differenceInDays comparison
    return documents.filter(doc => {
      if (!doc.fecha_caducidad || doc.estado === "Caducado" || doc.estado === "Archivado") return false;
      
      try {
        const fechaCaducidad = new Date(doc.fecha_caducidad);
        if (isNaN(fechaCaducidad.getTime())) return false;
        
        fechaCaducidad.setHours(0, 0, 0, 0); // Normalize expiration date as well
        const diasRestantes = differenceInDays(fechaCaducidad, today);
        return diasRestantes >= 0 && diasRestantes <= (doc.recordatorio_dias_antes || 30);
      } catch (error) {
        // Log the error if needed, but return false to exclude the document
        console.error("Error parsing date for document:", doc.id, doc.fecha_caducidad, error);
        return false;
      }
    }).sort((a, b) => new Date(a.fecha_caducidad) - new Date(b.fecha_caducidad));
  }, [documents]);

  const puestos = useMemo(() => {
    const psts = new Set();
    employees.forEach(emp => {
      if (emp.puesto) psts.add(emp.puesto);
    });
    return Array.from(psts).sort();
  }, [employees]);

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este documento?')) {
      deleteMutation.mutate(id);
    }
  };

  const getEstadoBadge = (estado) => {
    const config = {
      "Vigente": { className: "bg-green-100 text-green-800" },
      "Pendiente Revisión": { className: "bg-amber-100 text-amber-800" },
      "Caducado": { className: "bg-red-100 text-red-800" },
      "Archivado": { className: "bg-slate-100 text-slate-800" }
    }[estado] || { className: "bg-slate-100 text-slate-800" };

    return <Badge className={config.className}>{estado}</Badge>;
  };

  const stats = useMemo(() => {
    return {
      total: documents.length,
      vigentes: documents.filter(d => d.estado === "Vigente").length,
      pendientes: documents.filter(d => d.requiere_accion).length,
      caducados: documents.filter(d => d.estado === "Caducado").length
    };
  }, [documents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Documentación PRL</h2>
          <p className="text-slate-600 text-sm">Gestión de documentos de prevención de riesgos laborales</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Subir Documento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-xs text-amber-700 font-medium">Requieren Acción</p>
                <p className="text-2xl font-bold text-amber-900">{stats.pendientes}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium">Caducados</p>
                <p className="text-2xl font-bold text-red-900">{stats.caducados}</p>
              </div>
              <FileText className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {documentosProximosCaducar.length > 0 && (
        <Card className="bg-amber-50 border-2 border-amber-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Recordatorios de Caducidad ({documentosProximosCaducar.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documentosProximosCaducar.map(doc => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const fechaCaducidad = new Date(doc.fecha_caducidad);
                fechaCaducidad.setHours(0,0,0,0);
                const diasRestantes = differenceInDays(fechaCaducidad, today);
                return (
                  <div key={doc.id} className="p-3 bg-white rounded border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-amber-900">{doc.titulo}</div>
                        <div className="text-xs text-slate-600">{doc.tipo_documento}</div>
                        <div className="text-xs text-amber-700 mt-1">
                          ⏰ Caduca en {diasRestantes} días - {format(new Date(doc.fecha_caducidad), "dd/MM/yyyy", { locale: es })}
                        </div>
                      </div>
                      <Badge className={diasRestantes <= 7 ? "bg-red-600" : "bg-amber-600"}>
                        {diasRestantes} días
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <CardTitle>Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Select value={filters.tipo_documento} onValueChange={(value) => setFilters({...filters, tipo_documento: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="Evaluación de Riesgos">Evaluación de Riesgos</SelectItem>
                  <SelectItem value="Política de Prevención">Política de Prevención</SelectItem>
                  <SelectItem value="Evaluación Solicitada">Evaluación Solicitada</SelectItem>
                  <SelectItem value="Evaluación Pendiente">Evaluación Pendiente</SelectItem>
                  <SelectItem value="Riesgo Comunicado">Riesgo Comunicado</SelectItem>
                  <SelectItem value="Riesgo Pendiente">Riesgo Pendiente</SelectItem>
                  <SelectItem value="Documentación de Formación">Documentación de Formación</SelectItem>
                  <SelectItem value="Plan de Emergencia">Plan de Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Select value={filters.estado} onValueChange={(value) => setFilters({...filters, estado: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Pendiente Revisión">Pendiente Revisión</SelectItem>
                  <SelectItem value="Caducado">Caducado</SelectItem>
                  <SelectItem value="Archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(documentsByType).map(([tipo, docs]) => (
        <Card key={tipo} className="shadow-lg">
          <CardHeader className="border-b border-slate-100 bg-slate-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {tipo} ({docs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{doc.titulo}</h3>
                        {getEstadoBadge(doc.estado)}
                        {doc.requiere_accion && (
                          <Badge className="bg-amber-600 text-white">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Acción Requerida
                          </Badge>
                        )}
                        {doc.version && (
                          <Badge variant="outline" className="text-xs">
                            v{doc.version}
                          </Badge>
                        )}
                      </div>
                      
                      {doc.descripcion && (
                        <p className="text-sm text-slate-600 mb-2">{doc.descripcion}</p>
                      )}

                      {(doc.puestos_afectados?.length > 0 || doc.roles_afectados?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {doc.puestos_afectados?.map((puesto, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {puesto}
                            </Badge>
                          ))}
                          {doc.roles_afectados?.map((rol, idx) => (
                            <Badge key={idx} className="bg-blue-100 text-blue-700 text-xs">
                              {rol}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>📅 {format(new Date(doc.fecha_documento), "dd/MM/yyyy", { locale: es })}</span>
                        {doc.fecha_caducidad && (
                          <span>⏰ Caduca: {format(new Date(doc.fecha_caducidad), "dd/MM/yyyy", { locale: es })}</span>
                        )}
                        {doc.historial_versiones && doc.historial_versiones.length > 0 && (
                          <span>📝 {doc.historial_versiones.length + 1} versiones</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.archivo_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
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
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredDocuments.length === 0 && (
        <Card className="shadow-lg">
          <CardContent className="p-12 text-center">
            <Upload className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No hay documentos que coincidan con los filtros</p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <PRLDocumentForm
          document={editingDocument}
          onClose={() => {
            setShowForm(false);
            setEditingDocument(null);
          }}
        />
      )}
    </div>
  );
}
