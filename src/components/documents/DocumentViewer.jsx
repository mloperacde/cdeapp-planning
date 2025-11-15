import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Edit, History, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DocumentViewer({ document, onClose, onEdit }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{document.titulo}</DialogTitle>
            <div className="flex gap-2">
              <Button onClick={onEdit} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button onClick={() => window.open(document.archivo_url, '_blank')} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600">{document.categoria}</Badge>
            <Badge className="bg-green-600">v{document.version}</Badge>
            {document.estado === "Vigente" && <Badge className="bg-green-100 text-green-800">Vigente</Badge>}
            {document.roles_acceso?.length > 0 && (
              <Badge className="bg-purple-100 text-purple-800">
                <Shield className="w-3 h-3 mr-1" />
                Acceso Restringido
              </Badge>
            )}
          </div>

          {document.descripcion && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-700">{document.descripcion}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-slate-600">Fecha Creación</div>
                <div className="font-semibold">
                  {format(new Date(document.fecha_creacion || document.created_date), "dd/MM/yyyy", { locale: es })}
                </div>
              </CardContent>
            </Card>

            {document.fecha_caducidad && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-600">Fecha Caducidad</div>
                  <div className="font-semibold">
                    {format(new Date(document.fecha_caducidad), "dd/MM/yyyy", { locale: es })}
                  </div>
                </CardContent>
              </Card>
            )}

            {document.contador_descargas > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-600">Descargas</div>
                  <div className="font-semibold">{document.contador_descargas}</div>
                </CardContent>
              </Card>
            )}
          </div>

          {document.etiquetas?.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">Etiquetas:</div>
              <div className="flex flex-wrap gap-1">
                {document.etiquetas.map((tag, idx) => (
                  <Badge key={idx} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {document.historial_versiones?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Historial de Versiones</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {document.historial_versiones.reverse().map((version, idx) => (
                    <div key={idx} className="border rounded p-3 bg-slate-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-sm">v{version.version}</div>
                          <div className="text-xs text-slate-600">
                            {format(new Date(version.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                          {version.cambios && (
                            <div className="text-xs text-slate-700 mt-1">{version.cambios}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(version.archivo_url, '_blank')}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}