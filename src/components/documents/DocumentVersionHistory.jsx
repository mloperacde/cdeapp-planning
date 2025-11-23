import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Download, RotateCcw, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function DocumentVersionHistory({ document }) {
  const queryClient = useQueryClient();

  const restoreVersionMutation = useMutation({
    mutationFn: async (version) => {
      const currentHistorial = document.historial_versiones || [];
      
      // Guardar versión actual en historial
      currentHistorial.push({
        version: document.version,
        fecha: document.ultima_modificacion || document.created_date,
        archivo_url: document.archivo_url,
        cambios: document.cambios_recientes || "Versión anterior",
        subido_por: document.modificado_por || document.created_by
      });

      // Restaurar versión seleccionada
      return base44.entities.Document.update(document.id, {
        version: `${document.version} (restaurada de ${version.version})`,
        archivo_url: version.archivo_url,
        historial_versiones: currentHistorial,
        cambios_recientes: `Restaurada versión ${version.version}`,
        ultima_modificacion: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Versión restaurada correctamente");
    },
    onError: (error) => {
      toast.error("Error al restaurar versión: " + error.message);
    }
  });

  const versions = [
    {
      version: document.version,
      fecha: document.ultima_modificacion || document.created_date,
      archivo_url: document.archivo_url,
      cambios: document.cambios_recientes || "Versión actual",
      subido_por: document.modificado_por || document.created_by,
      isCurrent: true
    },
    ...(document.historial_versiones || []).map(v => ({ ...v, isCurrent: false }))
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Historial de Versiones ({versions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {versions.map((version, idx) => (
            <div
              key={idx}
              className={`border rounded-lg p-4 ${
                version.isCurrent ? 'bg-blue-50 border-blue-300' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold">Versión {version.version}</span>
                  {version.isCurrent && (
                    <Badge className="bg-blue-600">Actual</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(version.archivo_url, '_blank')}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  {!version.isCurrent && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm('¿Restaurar esta versión? La versión actual se guardará en el historial.')) {
                          restoreVersionMutation.mutate(version);
                        }
                      }}
                      title="Restaurar esta versión"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-slate-700 mb-2">{version.cambios}</p>
              
              <div className="flex gap-4 text-xs text-slate-500">
                <span>📅 {format(new Date(version.fecha), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                {version.subido_por && (
                  <span>👤 {version.subido_por}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}